import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../app/api/lots/route';
import { NextRequest } from 'next/server';

// Mock Next.js NextResponse
vi.mock('next/server', () => {
    return {
        NextResponse: {
            json: vi.fn((data, options) => {
                JSON.stringify(data);
                return { data, options };
            }),
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
    beforeEach(() => {
        process.env.ADMIN_API_KEY = 'test-secret-key';
    });

    it('should return 401 if missing authorization header', async () => {
        const req = new Request('http://localhost/api/lots') as unknown as NextRequest;
        const response = await GET(req);
        expect(response).toEqual({ data: { error: 'Unauthorized' }, options: { status: 401 } });
    });

    it('should return 401 if invalid authorization header', async () => {
        const req = new Request('http://localhost/api/lots', {
            headers: { 'Authorization': 'Bearer wrong-key' }
        }) as unknown as NextRequest;
        const response = await GET(req);
        expect(response).toEqual({ data: { error: 'Unauthorized' }, options: { status: 401 } });
    });

    it('should return lots from database if authorized', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findMany as any).mockResolvedValue([{ id: 'mock-lot-1' }]);

        const req = new Request('http://localhost/api/lots', {
            headers: { 'Authorization': 'Bearer test-secret-key' }
        }) as unknown as NextRequest;
        const response = await GET(req);

        expect(prisma.lot.findMany).toHaveBeenCalled();
        expect(response).toEqual({ data: [{ id: 'mock-lot-1' }], options: undefined });
    });

    it('should serialize Prisma BigInt fields in authorized lots response', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findMany as any).mockResolvedValue([
            {
                id: 'mock-lot-1',
                owner: { id: 'owner-1', telegramId: BigInt('123456789012345') },
                bids: [{ id: 'bid-1', amount: '1000000' }],
            },
        ]);

        const req = new Request('http://localhost/api/lots', {
            headers: { 'Authorization': 'Bearer test-secret-key' }
        }) as unknown as NextRequest;
        const response = await GET(req);

        expect(response).toEqual({
            data: [
                {
                    id: 'mock-lot-1',
                    owner: { id: 'owner-1', telegramId: '123456789012345' },
                    bids: [{ id: 'bid-1', amount: '1000000' }],
                },
            ],
            options: undefined,
        });
    });

    it('should handle database errors gracefully', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findMany as any).mockRejectedValue(new Error('DB Error'));

        const req = new Request('http://localhost/api/lots', {
            headers: { 'Authorization': 'Bearer test-secret-key' }
        }) as unknown as NextRequest;
        const response = await GET(req);

        expect(response).toEqual({ data: { error: 'Failed to fetch lots' }, options: { status: 500 } });
    });
});
