import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock admin-auth
vi.mock('../lib/admin-auth', () => ({
    isAuthenticated: vi.fn(),
}));

// Mock the queue client
vi.mock('../lib/queue/client', () => ({
    slaQueue: {
        add: vi.fn(),
        remove: vi.fn(),
    },
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

import { isAuthenticated } from '../lib/admin-auth';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';

describe('POST /api/admin/lots/[id]/complete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    it('should return 401 if not authenticated', async () => {
        (isAuthenticated as any).mockResolvedValue(false);

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(401);
    });

    it('should return 404 if lot not found', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue(null);

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(404);
    });

    it('should return 404 if lot not in MANAGER_HANDOFF status', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'AUCTION',
        });

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        expect(response.status).toBe(404);
    });

    it('should complete deal: MANAGER_HANDOFF → SOLD, notify both parties', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'MANAGER_HANDOFF',
            address: 'ул. Тверская, д. 15',
            owner: { telegramId: BigInt(111), fullName: 'Иванов А.' },
            winner: { telegramId: BigInt(222), fullName: 'Смирнов К.' },
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-1/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-1' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);

        // Status updated to SOLD via atomic updateMany
        expect(prisma.lot.updateMany).toHaveBeenCalledWith({
            where: { id: 'lot-1', status: 'MANAGER_HANDOFF' },
            data: { status: 'SOLD' },
        });

        // Both parties notified
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            111,
            expect.stringContaining('успешно завершена')
        );
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            222,
            expect.stringContaining('успешно завершена')
        );
    });

    it('should handle missing owner/investor telegramId gracefully', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-2',
            status: 'MANAGER_HANDOFF',
            address: 'ул. Арбат, д. 10',
            owner: null,
            winner: null,
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-2/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-2' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should not crash if Telegram API fails', async () => {
        (isAuthenticated as any).mockResolvedValue(true);
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-3',
            status: 'MANAGER_HANDOFF',
            address: 'ул. Ленина, д. 1',
            owner: { telegramId: BigInt(333), fullName: 'Петров' },
            winner: { telegramId: BigInt(444), fullName: 'Козлов' },
        });
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });
        (bot.api.sendMessage as any).mockRejectedValue(new Error('Telegram down'));

        const { POST } = await import('../app/api/admin/lots/[id]/complete/route');
        const response = await POST(
            new Request('http://localhost/api/admin/lots/lot-3/complete', { method: 'POST' }),
            { params: Promise.resolve({ id: 'lot-3' }) }
        );

        const json = await response.json();
        expect(json.success).toBe(true);
    });
});
