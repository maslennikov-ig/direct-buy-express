import { describe, expect, it, vi, beforeEach } from 'vitest';
import { findMatchingInvestors } from '../lib/matcher';
import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';

vi.mock('../lib/db', () => ({
    prisma: {
        investorProfile: {
            findMany: vi.fn(),
        },
    },
}));

describe('Matcher Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should query DB with correct expectedPrice boundaries', async () => {
        const mockLot = {
            id: 'lot1',
            ownerId: 'owner1',
            address: 'Moscow',
            area: 50,
            floor: 5,
            rooms: 2,
            hasDebts: false,
            hasMortgage: false,
            hasRegistered: false,
            expectedPrice: new Prisma.Decimal(15000000),
            urgencyReason: null,
            status: 'AUCTION' as const,
            auctionEndsAt: null,
            createdAt: new Date(),
        };

        const mockInvestors = [
            {
                user: { telegramId: BigInt(12345) },
                minBudget: new Prisma.Decimal(10000000),
                maxBudget: new Prisma.Decimal(20000000),
                districts: [],
                isVerified: true,
            }
        ];

        (prisma.investorProfile.findMany as any).mockResolvedValue(mockInvestors);

        const result = await findMatchingInvestors(mockLot as any);

        expect(prisma.investorProfile.findMany).toHaveBeenCalledWith({
            where: {
                isVerified: true,
                minBudget: { lte: mockLot.expectedPrice },
                maxBudget: { gte: mockLot.expectedPrice },
            },
            include: { user: true }
        });

        // Test district logic applied in JS or DB
        expect(result.length).toBe(1);
        expect(result[0].user.telegramId).toBe(BigInt(12345));
    });

    it('should correctly filter investors by districts in JS', async () => {
        const mockLot = {
            id: 'lot1',
            address: 'Москва, ул. Тверская 15',
            expectedPrice: new Prisma.Decimal(15000000),
        };

        const mockInvestors = [
            {
                user: { telegramId: BigInt(1) },
                districts: [], // Should match Any
            },
            {
                user: { telegramId: BigInt(2) },
                districts: ['Тверская'], // Should match
            },
            {
                user: { telegramId: BigInt(3) },
                districts: ['Реутов'], // Should NOT match
            }
        ];

        (prisma.investorProfile.findMany as any).mockResolvedValue(mockInvestors);

        const result = await findMatchingInvestors(mockLot as any);

        expect(result.length).toBe(2);
        expect(result[0].user.telegramId).toBe(BigInt(1));
        expect(result[1].user.telegramId).toBe(BigInt(2));
    });
});
