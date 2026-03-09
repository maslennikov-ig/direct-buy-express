import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin/* routes (except /admin/login and API auth route)
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        const validToken = process.env.ADMIN_SESSION_TOKEN;
        if (!validToken) {
            return new NextResponse('Server misconfigured: ADMIN_SESSION_TOKEN not set', { status: 500 });
        }

        const sessionCookie = request.cookies.get('admin_session');
        if (!sessionCookie || sessionCookie.value !== validToken) {
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
