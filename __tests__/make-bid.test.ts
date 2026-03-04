import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeBidConversation } from '../bot/conversations/make-bid';
import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
        },
        bid: {
            count: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        }
    },
}));

describe('makeBidConversation', () => {
    let mockConversation: any;
    let mockCtx: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConversation = {
            wait: vi.fn(),
            external: vi.fn().mockImplementation((cb) => cb()),
        };

        mockCtx = {
            reply: vi.fn(),
            match: ['bid_lot_123', '123'], // simulated regex match
            from: { id: 100 },
            answerCallbackQuery: vi.fn(),
        };
    });

    it('should reply with error if lot does not exist or not in AUCTION status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue(null);

        await makeBidConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(
            expect.stringContaining('не найден или сбор предложений уже закрыт')
        );
    });

    it('should save the bid and notify the user on valid positive amount', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({ id: '123', status: 'AUCTION' });

        // Mock user interacting with conversation
        mockConversation.wait.mockResolvedValue({
            message: { text: '16 500 000' }
        });

        // Mock user exists, is investor, and is verified
        (prisma.user.findUnique as any).mockResolvedValue({
            id: 'user1',
            role: 'INVESTOR',
            investorProfile: { isVerified: true }
        });

        // Mock less than 5 bids
        (prisma.bid.count as any).mockResolvedValue(1);
        (prisma.bid.upsert as any).mockResolvedValue({});

        await makeBidConversation(mockConversation, mockCtx);

        expect(prisma.bid.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ amount: new Prisma.Decimal("16500000") })
            })
        );
        expect(mockCtx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Ваше предложение принято')
        );
    });
});
