import { describe, expect, it, vi } from 'vitest';
import { GET } from '../app/api/lots/route';

// Mock Next.js NextResponse
vi.mock('next/server', () => {
    return {
        NextResponse: {
            json: vi.fn((data, options) => ({ data, options })),
        },
    };
});

// Mock Prisma DB
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findMany: vi.fn(),
        },
    },
}));

describe('Lots API', () => {
    it('should return lots from database', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findMany as any).mockResolvedValue([{ id: 'mock-lot-1' }]);

        const response = await GET();

        expect(prisma.lot.findMany).toHaveBeenCalled();
        expect(response).toEqual({ data: [{ id: 'mock-lot-1' }], options: undefined });
    });

    it('should handle database errors gracefully', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findMany as any).mockRejectedValue(new Error('DB Error'));

        const response = await GET();

        expect(response).toEqual({ data: { error: 'Failed to fetch lots' }, options: { status: 500 } });
    });
});
