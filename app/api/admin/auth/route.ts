import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const token = process.env.ADMIN_SESSION_TOKEN;

        if (!adminPassword || !token) {
            console.error('[SECURITY] ADMIN_PASSWORD or ADMIN_SESSION_TOKEN not configured');
            return NextResponse.json(
                { error: 'Server misconfigured' },
                { status: 500 }
            );
        }

        const { password } = await request.json();
        if (password !== adminPassword) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        const response = NextResponse.json({ success: true });

        response.cookies.set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
    } catch {
        return NextResponse.json(
            { error: 'Bad request' },
            { status: 400 }
        );
    }
}
