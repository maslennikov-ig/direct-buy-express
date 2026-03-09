import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock admin-auth
vi.mock('../lib/admin-auth', () => ({
    isAuthenticated: vi.fn(),
}));

// Mock prisma
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

// Mock bot
vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn().mockResolvedValue({}),
        },
    },
}));

// Mock queue client
vi.mock('../lib/queue/client', () => ({
    slaQueue: {
        add: vi.fn().mockResolvedValue({}),
        remove: vi.fn(),
    },
}));

import { isAuthenticated } from '../lib/admin-auth';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';
import { slaQueue } from '../lib/queue/client';

describe('POST /api/admin/lots/[id]/cancel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    it('should return 401 if not authenticated', async () => {
        (isAuthenticated as any).mockResolvedValue(false);

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/cancel', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(401);
    });

    it('should return 404 if lot not found', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue(null);

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/cancel', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(404);
    });

    it('should return 404 if lot not in MANAGER_HANDOFF status', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'DRAFT',
        });

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(404);
    });

    it('should cancel deal: MANAGER_HANDOFF → CANCELED, notify both parties', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'MANAGER_HANDOFF',
            address: 'ул. Тверская, д. 15',
            owner: { telegramId: BigInt(111), fullName: 'Иванов А.' },
            winner: { telegramId: BigInt(222), fullName: 'Смирнов К.' },
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);

        // Status updated to CANCELED via updateMany
        expect(prisma.lot.updateMany).toHaveBeenCalledWith({
            where: { id: 'lot-1', status: 'MANAGER_HANDOFF' },
            data: { status: 'CANCELED' },
        });

        // Both parties notified
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            111,
            expect.stringContaining('отменена')
        );
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            222,
            expect.stringContaining('отменена')
        );
    });

    it('should return to auction if returnToAuction=true', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-2',
            status: 'MANAGER_HANDOFF',
            address: 'Невский пр., д. 45',
            owner: { telegramId: BigInt(333), fullName: 'Петрова М.' },
            winner: { telegramId: BigInt(444), fullName: 'Козлов Д.' },
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-2/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnToAuction: true }),
            }),
            { params: Promise.resolve({ id: 'lot-2' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);

        // Status updated to AUCTION via atomic updateMany
        expect(prisma.lot.updateMany).toHaveBeenCalledWith({
            where: { id: 'lot-2', status: 'MANAGER_HANDOFF' },
            data: {
                status: 'AUCTION',
                auctionEndsAt: expect.any(Date),
            },
        });

        // CLOSE_AUCTION timer scheduled
        expect(slaQueue.add).toHaveBeenCalledWith(
            'CLOSE_AUCTION',
            { lotId: 'lot-2' },
            expect.objectContaining({ delay: 12 * 60 * 60 * 1000 })
        );

        // Both notified about re-auction
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            333,
            expect.stringContaining('аукцион')
        );
    });

    it('should handle missing telegramId gracefully', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-3',
            status: 'MANAGER_HANDOFF',
            address: 'ул. Арбат, д. 10',
            owner: null,
            winner: null,
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });

        const { POST } = await import('../app/api/admin/lots/[id]/cancel/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-3/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ id: 'lot-3' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });
});
