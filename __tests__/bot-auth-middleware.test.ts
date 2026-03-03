import { describe, expect, it, vi } from 'vitest';
import { authMiddleware } from '../bot/middleware/auth';

describe('Auth Middleware', () => {
    it('should be a function', () => {
        expect(typeof authMiddleware).toBe('function');
    });

    it('should call next function', async () => {
        const next = vi.fn();
        const mockCtx = {} as any;
        await authMiddleware(mockCtx, next);
        expect(next).toHaveBeenCalled();
    });
});
