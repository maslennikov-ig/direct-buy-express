import { Lot, Prisma, InvestorProfile, User } from '@prisma/client';
import { prisma } from './db';

type InvestorWithUser = InvestorProfile & { user: User };

export async function findMatchingInvestors(lot: Lot): Promise<InvestorWithUser[]> {
    const matchingInvestors = await prisma.investorProfile.findMany({
        where: {
            isVerified: true,
            minBudget: {
                lte: lot.expectedPrice,
            },
            maxBudget: {
                gte: lot.expectedPrice,
            },
        },
        include: {
            user: true,
        },
    });

    // In JS we filter by districts
    // If investor sets empty districts, it means "Any" as approved by user
    return matchingInvestors.filter(inves => {
        if (!inves.districts || inves.districts.length === 0) return true;

        // Ensure lot has address, check simple includes or match
        return inves.districts.some(d => lot.address.toLowerCase().includes(d.toLowerCase()));
    });
}
