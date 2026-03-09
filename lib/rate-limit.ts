import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// Simple rate limiter for admin API endpoints
// Uses in-memory store (resets on restart — appropriate for single-instance VPS)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

export function rateLimit(request: NextRequest): NextResponse | null {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return null; // Allowed
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        logger.warn({ ip, count: entry.count }, 'Rate limit exceeded');
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    return null; // Allowed
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitStore.entries()) {
            if (now > value.resetAt) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}
