import { NextResponse } from 'next/server';
import { verifyTelegramAuth, TelegramAuthData } from '@/lib/telegram-auth';
import { getManagerChatIds } from '@/lib/notify-managers';

export async function POST(request: Request) {
    try {
        const botToken = process.env.BOT_TOKEN;
        const sessionToken = process.env.ADMIN_SESSION_TOKEN;

        if (!botToken || !sessionToken) {
            console.error('[SECURITY] BOT_TOKEN or ADMIN_SESSION_TOKEN not configured');
            return NextResponse.json(
                { error: 'Server misconfigured' },
                { status: 500 }
            );
        }

        const data: TelegramAuthData = await request.json();
        
        // 1. Verify Telegram signature & expiration
        if (!data || !data.id || !verifyTelegramAuth(data, botToken)) {
            console.warn(`[AUTH] Invalid Telegram login attempt or expired signature for ID ${data ? data.id : 'unknown'}`);
            return NextResponse.json(
                { error: 'Неверная или устаревшая подпись авторизации' },
                { status: 401 }
            );
        }

        // 2. Check if user is in MANAGER_CHAT_ID list
        const managerIds = getManagerChatIds();
        if (!managerIds.includes(data.id)) {
            console.warn(`[AUTH] Unauthorized manager access attempt: ID ${data.id} (@${data.username})`);
            return NextResponse.json(
                { error: 'Доступ закрыт: Обратитесь к администраторам' },
                { status: 403 }
            );
        }

        const response = NextResponse.json({ success: true, user: data });

        response.cookies.set('admin_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
    } catch (e) {
        console.error('[AUTH] Login error:', e);
        return NextResponse.json(
            { error: 'Bad request' },
            { status: 400 }
        );
    }
}
