import { NextResponse } from 'next/server';
import { getAllSettings, updateSettings, SettingKeys } from '@/lib/settings';
import { isAuthenticated } from '@/lib/admin-auth';
import { z } from 'zod';

export async function GET() {
    if (!await isAuthenticated()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const settings = await getAllSettings();
        return NextResponse.json(settings);
    } catch (err) {
        console.error('[SETTINGS] Failed to load settings:', err);
        return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

// Zod schema for settings validation
const settingsSchema = z.object({
    [SettingKeys.MANAGER_CHAT_ID]: z.string()
        .refine(v => {
            const ids = v.split(',').map(s => s.trim()).filter(Boolean);
            return ids.length > 0 && ids.every(id => !isNaN(Number(id)));
        }, { message: 'Укажите хотя бы один ID, и все ID должны быть числами' }),
    
    [SettingKeys.PLATFORM_FEE_RUB]: z.string()
        .refine(v => !isNaN(Number(v)) && Number(v) >= 0, { message: 'Комиссия должна быть неотрицательным числом' }),
        
    [SettingKeys.SLA_DOCS_UPLOAD_HOURS]: z.string()
        .refine(v => !isNaN(Number(v)) && Number(v) > 0, { message: 'SLA должен быть положительным числом' }),
        
    [SettingKeys.SLA_INVESTOR_REVIEW_HOURS]: z.string()
        .refine(v => !isNaN(Number(v)) && Number(v) > 0, { message: 'SLA должен быть положительным числом' }),
        
    [SettingKeys.SLA_OFFER_RESPONSE_HOURS]: z.string()
        .refine(v => !isNaN(Number(v)) && Number(v) > 0, { message: 'SLA должен быть положительным числом' }),
        
    [SettingKeys.BOT_ACTIVE]: z.string()
        .refine(v => v === 'true' || v === 'false', { message: 'Значение должно быть true или false' }),
}).partial().strict();

export async function PUT(request: Request) {
    if (!await isAuthenticated()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();

        if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
            return NextResponse.json({ error: 'Пустой запрос' }, { status: 400 });
        }

        const parsed = settingsSchema.safeParse(body);
        
        if (!parsed.success) {
            // Flatten Zod errors into a simple key-value structure
            // Example: { MANAGER_CHAT_ID: ["Укажите хотя бы один ID"] }
            // We take the first error message for each field.
            const fieldErrors = parsed.error.flatten().fieldErrors;
            const errors: Record<string, string> = {};
            for (const [key, messages] of Object.entries(fieldErrors)) {
                if (messages && messages.length > 0) {
                    errors[key] = messages[0];
                }
            }
            return NextResponse.json({ error: 'Ошибки валидации', details: errors }, { status: 400 });
        }

        // Convert all values to strings
        const toSave: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed.data)) {
            toSave[key] = String(value);
        }

        await updateSettings(toSave);

        const updated = await getAllSettings();
        return NextResponse.json(updated);
    } catch (err) {
        console.error('[SETTINGS] Failed to update settings:', err);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
