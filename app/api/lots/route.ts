import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

function toJsonSafe<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_key, nestedValue) =>
            typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue
        )
    ) as T;
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const validKey = process.env.ADMIN_API_KEY;

    if (!validKey || authHeader !== `Bearer ${validKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const lots = await prisma.lot.findMany({
            take: 100,
            include: { owner: true, bids: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(toJsonSafe(lots));
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
    }
}
