import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createLotConversation } from '@/bot/conversations/create-lot';
import { prisma } from '@/lib/db';

// Mock DB
vi.mock('@/lib/db', () => ({
    prisma: {
        user: { upsert: vi.fn() },
        lot: { create: vi.fn() },
        media: { createMany: vi.fn() },
    },
}));

function createMockCtx() {
    return {
        reply: vi.fn(),
        from: { id: 123456789, first_name: 'Test Owner' },
    };
}

// Base mock values that won't get stuck in while(true) loops for number parsing
function getBaseMockValues(callCount: number) {
    if (callCount === 1) return { message: { text: "Address" } };
    if (callCount === 2) return { message: { text: "45.5" } }; // Area (parseFloat)
    if (callCount === 3) return { message: { text: "2" } }; // Floor (parseInt)
    if (callCount === 4) return { message: { text: "3" } }; // Rooms (parseInt)
    if (callCount >= 5 && callCount <= 7) return { message: { text: "Нет" } }; // Debts, Mortgage, Registered
    return null;
}

describe('Photo Upload Validation (Phase 16)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should require minimum 7 photos before allowing completion', async () => {
        const ctx = createMockCtx();
        let callCount = 0;

        const mockWait = vi.fn().mockImplementation(() => {
            callCount++;

            const baseValue = getBaseMockValues(callCount);
            if (baseValue) return baseValue;

            // Photo upload phase
            if (callCount === 8) return { message: { photo: [{ file_id: "photo1_small" }, { file_id: "photo1_large" }] } }; // 1 photo
            if (callCount === 9) return { message: { photo: [{ file_id: "photo2_small" }, { file_id: "photo2_large" }] } }; // 2 photos
            if (callCount === 10) return { message: { text: 'готово' } }; // Premature completion attempt!

            // Need 5 more to reach 7
            if (callCount >= 11 && callCount <= 15) return { message: { photo: [{ file_id: `photo${callCount - 8}_small` }, { file_id: `photo${callCount - 8}_large` }] } };

            // Now we have 7 photos. Try to complete.
            if (callCount === 16) return { message: { text: 'готово' } }; // Successful completion!

            // Financials (Price)
            if (callCount === 17) return { message: { text: "10000000" } };
            // Urgency
            return { message: { text: "Mock Urgency" } };
        });

        const conversation = {
            wait: mockWait,
            external: vi.fn().mockImplementation((fn) => fn()),
        };

        (prisma.user.upsert as any).mockResolvedValue({ id: 'user-1' });
        (prisma.lot.create as any).mockResolvedValue({ id: 'lot-1' });

        await createLotConversation(conversation as any, ctx as any);

        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Необходимо загрузить минимум 7 фото. Сейчас: 2')
        );

        expect(prisma.media.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ type: 'PHOTO', url: 'photo1_large' }),
                expect.objectContaining({ type: 'PHOTO', url: 'photo7_large' })
            ])
        });

        const createManyCall = (prisma.media.createMany as any).mock.calls[0][0];
        expect(createManyCall.data.length).toBe(7);
    });

    it('should automatically proceed after receiving exactly 10 photos', async () => {
        const ctx = createMockCtx();
        let callCount = 0;

        const mockWait = vi.fn().mockImplementation(() => {
            callCount++;

            const baseValue = getBaseMockValues(callCount);
            if (baseValue) return baseValue;

            // Upload exactly 10 photos
            if (callCount >= 8 && callCount <= 17) return { message: { photo: [{ file_id: `photoX_small` }, { file_id: `photoX_large` }] } };

            // Financials
            if (callCount === 18) return { message: { text: "10000000" } };
            return { message: { text: "Mock urgency" } };
        });

        const conversation = {
            wait: mockWait,
            external: vi.fn().mockImplementation((fn) => fn()),
        };

        (prisma.user.upsert as any).mockResolvedValue({ id: 'user-1' });
        (prisma.lot.create as any).mockResolvedValue({ id: 'lot-1' });

        await createLotConversation(conversation as any, ctx as any);

        expect(ctx.reply).toHaveBeenCalledWith('✅ Загружено 10 фото (максимум). Переходим дальше.');

        const createManyCall = (prisma.media.createMany as any).mock.calls[0][0];
        expect(createManyCall.data.length).toBe(10);
    });

    it('should accept photos sent as documents', async () => {
        const ctx = createMockCtx();
        let callCount = 0;

        const mockWait = vi.fn().mockImplementation(() => {
            callCount++;

            const baseValue = getBaseMockValues(callCount);
            if (baseValue) return baseValue;

            // Upload 7 documents
            if (callCount >= 8 && callCount <= 14) return {
                message: {
                    document: { file_id: `doc_photo${callCount}`, mime_type: 'image/jpeg' }
                }
            };

            if (callCount === 15) return { message: { text: 'готово' } };

            if (callCount === 16) return { message: { text: "100" } };
            return { message: { text: "Mock" } };
        });

        const conversation = {
            wait: mockWait,
            external: vi.fn().mockImplementation((fn) => fn()),
        };

        (prisma.user.upsert as any).mockResolvedValue({ id: 'u' });
        (prisma.lot.create as any).mockResolvedValue({ id: 'l' });

        await createLotConversation(conversation as any, ctx as any);

        const createManyCall = (prisma.media.createMany as any).mock.calls[0][0];
        expect(createManyCall.data.length).toBe(7);
        expect(createManyCall.data[0].url).toBe('doc_photo8');
    });
});
