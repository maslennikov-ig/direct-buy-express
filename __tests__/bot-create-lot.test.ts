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
        }
    }
}));

// Mock DaData
vi.mock('../lib/dadata', () => ({
    suggestAddress: vi.fn().mockResolvedValue([{ value: 'г Москва, ул Тверская, д 1' }])
}));

describe('createLotConversation', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof createLotConversation).toBe('function');
    });

    it('should process the full conversation and save the lot to DB', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Owner Name' },
            reply: vi.fn(),
        } as any;

        // Simulate user answering the sequential questions
        const mockAnswers = [
            { message: { text: 'Тверская 1' } }, // Address
            { message: { text: '45.5' } },       // Area
            { message: { text: '5' } },          // Floor
            { message: { text: '2' } },          // Rooms
            { message: { text: 'Нет' } },        // Debts
            { message: { text: 'Да' } },         // Mortgage
            { message: { text: 'Нет' } },        // Registered
            { message: { text: '15000000' } },   // Price
            { message: { text: 'Срочный переезд' } } // Urgency
        ];

        let waitIndex = 0;
        const mockConversation = {
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb) => {
                // execute the callback immediately
                return await cb();
            })
        } as any;

        await createLotConversation(mockConversation, mockCtx);

        expect(console.error).not.toHaveBeenCalled();
        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Лот успешно сохранен как ЧЕРНОВИК'));

        // Check DB operations
        expect(console.error).not.toHaveBeenCalled();
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
    });
});
