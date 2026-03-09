import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createLotConversation } from '../bot/conversations/create-lot';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        user: {
            upsert: vi.fn().mockResolvedValue({ id: 'user-id' })
        },
        lot: {
            create: vi.fn().mockResolvedValue({ id: 'lot-id' })
        },
        media: {
            createMany: vi.fn().mockResolvedValue({ count: 7 })
        }
    }
}));

// Mock DaData
vi.mock('../lib/dadata', () => ({
    suggestAddress: vi.fn().mockResolvedValue([{ value: 'г Москва, ул Тверская, д 1' }])
}));

/** Generate N mock photo messages for the conversation */
function makePhotoMessages(n: number) {
    return Array.from({ length: n }, (_, i) => ({
        message: { photo: [{ file_id: `small_${i}`, width: 100, height: 100 }, { file_id: `photo_${i}`, width: 800, height: 600 }] }
    }));
}

describe('createLotConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof createLotConversation).toBe('function');
    });

    it('should process the full conversation with photos and save the lot to DB', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } }, // Address
            { message: { text: '45.5' } },       // Area
            { message: { text: '5' } },          // Floor
            { message: { text: '2' } },          // Rooms
            { message: { text: 'Нет' } },        // Debts
            { message: { text: 'Да' } },         // Mortgage
            { message: { text: 'Нет' } },        // Registered
            ...makePhotoMessages(7),              // 7 photos (minimum)
            { message: { text: 'Готово' } },     // Done uploading
            { message: { text: '15000000' } },   // Price
            { message: { text: 'Срочный переезд' } } // Urgency
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => {
                return await cb();
            })
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(console.error).not.toHaveBeenCalled();
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Лот успешно сохранен как ЧЕРНОВИК'));

        const { prisma } = await import('../lib/db');
        expect(prisma.lot.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    address: 'г Москва, ул Тверская, д 1',
                    area: 45.5,
                    floor: 5,
                    rooms: 2,
                    hasDebts: false,
                    hasMortgage: true,
                    hasRegistered: false,
                    expectedPrice: expect.anything(),
                    urgencyReason: 'Срочный переезд',
                    status: 'DRAFT',
                })
            })
        );

        // Verify Media records were created for photos
        expect(prisma.media.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ lotId: 'lot-id', type: 'PHOTO', url: 'photo_0' }),
            ]),
        });
        expect((prisma.media.createMany as any).mock.calls[0][0].data).toHaveLength(7);
    });

    it('should reject "done" if less than 7 photos uploaded', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: '45.5' } },
            { message: { text: '5' } },
            { message: { text: '2' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            ...makePhotoMessages(3),             // Only 3 photos
            { message: { text: 'Готово' } },     // Try to finish early — rejected
            ...makePhotoMessages(4),             // 4 more = 7 total
            { message: { text: 'Готово' } },     // Now accepted
            { message: { text: '15000000' } },
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => await cb())
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        // Verify it rejected the early "done"
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('минимум 7 фото'));
        // But eventually succeeded
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('ЧЕРНОВИК'));
    });

    it('should auto-stop at 10 photos', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: '45.5' } },
            { message: { text: '5' } },
            { message: { text: '2' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            ...makePhotoMessages(10),            // 10 photos — hits max
            { message: { text: '15000000' } },
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => await cb())
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('максимум'));
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('ЧЕРНОВИК'));
    });

    it('should prompt again on invalid area, floor, rooms and price', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: 'Invalid' } },    // Invalid Area
            { message: { text: '45.5' } },       // Valid Area
            { message: { text: 'NotAFloor' } },  // Invalid Floor
            { message: { text: '5' } },          // Valid Floor
            { message: { text: 'Five' } },       // Invalid Rooms
            { message: { text: '2' } },          // Valid Rooms
            { message: { text: 'Нет' } },        // Debts
            { message: { text: 'Да' } },         // Mortgage
            { message: { text: 'Нет' } },        // Registered
            ...makePhotoMessages(7),             // Photos
            { message: { text: 'Готово' } },
            { message: { text: 'LotsOfMoney' } },// Invalid Price
            { message: { text: '15000000' } },   // Valid Price
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => await cb())
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Пожалуйста, введите корректное число для площади'));
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Пожалуйста, введите корректный номер этажа'));
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Пожалуйста, введите корректное количество комнат'));
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Пожалуйста, введите сумму числом'));

        const { prisma } = await import('../lib/db');
        expect(prisma.lot.create).toHaveBeenCalled();
    });

    it('should return early if address text is missing', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockConversation = {
            wait: vi.fn().mockResolvedValue({ message: { photo: [] } }),
            external: vi.fn()
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledTimes(2);
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Операция прервана'));
    });

    it('should fallback to manual address if DaData returns no suggestions', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: '45.5' } },
            { message: { text: '5' } },
            { message: { text: '2' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Да' } },
            { message: { text: 'Нет' } },
            ...makePhotoMessages(7),
            { message: { text: 'Готово' } },
            { message: { text: '15000000' } },
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => {
                if (cb.toString().includes('suggestAddress')) {
                    return [];
                }
                return await cb();
            })
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Продолжаем. Введите общую площадь'));
    });

    it('should handle DB exception during save', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: '45.5' } },
            { message: { text: '5' } },
            { message: { text: '2' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Да' } },
            { message: { text: 'Нет' } },
            ...makePhotoMessages(7),
            { message: { text: 'Готово' } },
            { message: { text: '15000000' } },
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => await cb())
        } as any;

        const { prisma } = await import('../lib/db');
        (prisma.lot.create as any).mockRejectedValueOnce(new Error('DB Error'));

        await createLotConversation(mockConversation, mockCtx);

        expect(console.error).toHaveBeenCalled();
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Произошла ошибка при сохранении'));
    });

    it('should accept document uploads with image MIME type', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        const mockAnswers = [
            { message: { text: 'Тверская 1' } },
            { message: { text: '45.5' } },
            { message: { text: '5' } },
            { message: { text: '2' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            { message: { text: 'Нет' } },
            // Mix of photo and document uploads
            ...makePhotoMessages(5),
            { message: { document: { file_id: 'doc_photo_1', mime_type: 'image/jpeg' } } },
            { message: { document: { file_id: 'doc_photo_2', mime_type: 'image/png' } } },
            { message: { text: 'Готово' } },
            { message: { text: '15000000' } },
            { message: { text: 'Срочный переезд' } }
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => await cb())
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('ЧЕРНОВИК'));

        const { prisma } = await import('../lib/db');
        const mediaData = (prisma.media.createMany as any).mock.calls[0][0].data;
        expect(mediaData).toHaveLength(7);
        const urls = mediaData.map((m: any) => m.url);
        expect(urls).toContain('doc_photo_1');
        expect(urls).toContain('doc_photo_2');
    });
});
