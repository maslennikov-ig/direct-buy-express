import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authMiddleware } from '../bot/middleware/auth';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        user: {
            upsert: vi.fn().mockResolvedValue({ id: 'mock-user-id', role: 'OWNER' })
        }
    }
}));

describe('Auth Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should be a function', () => {
        expect(typeof authMiddleware).toBe('function');
    });

    it('should upsert user and call next function', async () => {
        const next = vi.fn();
        const mockCtx = {
            from: { id: 123456789, first_name: 'John', last_name: 'Doe' }
        } as any;

        await authMiddleware(mockCtx, next);

        const { prisma } = await import('../lib/db');
        expect(prisma.user.upsert).toHaveBeenCalledWith({
            where: { telegramId: 123456789 },
            update: { fullName: 'John Doe' },
            create: {
                telegramId: 123456789,
                fullName: 'John Doe',
                role: 'OWNER',
            }
        });
        expect(next).toHaveBeenCalled();
    });

    it('should handle undefined ctx.from safely', async () => {
        const next = vi.fn();
        const mockCtx = { from: undefined } as any;

        await authMiddleware(mockCtx, next);

        const { prisma } = await import('../lib/db');
        expect(prisma.user.upsert).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
});
