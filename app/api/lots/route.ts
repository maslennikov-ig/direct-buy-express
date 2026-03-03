import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
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
