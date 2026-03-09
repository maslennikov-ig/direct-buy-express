import { cookies } from 'next/headers';

/**
 * Shared admin authentication check.
 * Validates the admin_session cookie against the expected token.
 * Must be called with `await` since cookies() is async in Next.js 16+.
 */
export async function isAuthenticated(): Promise<boolean> {
    const validToken = process.env.ADMIN_SESSION_TOKEN;
    if (!validToken) {
        console.error('[SECURITY] ADMIN_SESSION_TOKEN is not set. All admin requests will be rejected.');
        return false;
    }
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    return session?.value === validToken;
}
