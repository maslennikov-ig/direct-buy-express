import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const validKey = process.env.ADMIN_API_KEY;

    if (!validKey || authHeader !== `Bearer ${validKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const lots = await prisma.lot.findMany({
            include: { owner: true, bids: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(lots);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
    }
}
