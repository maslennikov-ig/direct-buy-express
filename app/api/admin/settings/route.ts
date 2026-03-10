import { NextResponse } from 'next/server';
import { getAllSettings, updateSettings, SettingKeys } from '@/lib/settings';

export async function GET() {
    try {
        const settings = await getAllSettings();
        return NextResponse.json(settings);
    } catch (err) {
        console.error('[SETTINGS] Failed to load settings:', err);
        return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

// Validation rules per key
const VALIDATORS: Record<string, (v: string) => string | null> = {
    [SettingKeys.MANAGER_CHAT_ID]: (v) => {
        const ids = v.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) return 'Необходимо указать хотя бы один ID';
        if (ids.some(id => isNaN(Number(id)))) return 'Все ID должны быть числами';
        return null;
    },
    [SettingKeys.PLATFORM_FEE_RUB]: (v) => {
        const n = Number(v);
        if (isNaN(n) || n < 0) return 'Комиссия должна быть неотрицательным числом';
        return null;
    },
    [SettingKeys.SLA_DOCS_UPLOAD_HOURS]: (v) => {
        const n = Number(v);
        if (isNaN(n) || n <= 0) return 'SLA должен быть положительным числом';
        return null;
    },
    [SettingKeys.SLA_INVESTOR_REVIEW_HOURS]: (v) => {
        const n = Number(v);
        if (isNaN(n) || n <= 0) return 'SLA должен быть положительным числом';
        return null;
    },
    [SettingKeys.SLA_OFFER_RESPONSE_HOURS]: (v) => {
        const n = Number(v);
        if (isNaN(n) || n <= 0) return 'SLA должен быть положительным числом';
        return null;
    },
    [SettingKeys.BOT_ACTIVE]: (v) => {
        if (v !== 'true' && v !== 'false') return 'Значение должно быть true или false';
        return null;
    },
};

export async function PUT(request: Request) {
    try {
        const body: Record<string, string> = await request.json();

        if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
            return NextResponse.json({ error: 'Пустой запрос' }, { status: 400 });
        }

        // Validate each field
        const validKeys = Object.values(SettingKeys) as string[];
        const errors: Record<string, string> = {};

        for (const [key, value] of Object.entries(body)) {
            if (!validKeys.includes(key)) {
                errors[key] = 'Неизвестный параметр';
                continue;
            }
            const validator = VALIDATORS[key];
            if (validator) {
                const error = validator(String(value));
                if (error) errors[key] = error;
            }
        }

        if (Object.keys(errors).length > 0) {
            return NextResponse.json({ error: 'Ошибки валидации', details: errors }, { status: 400 });
        }

        // Convert all values to strings
        const toSave: Record<string, string> = {};
        for (const [key, value] of Object.entries(body)) {
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
