import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/admin-auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAuthenticated()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.investorProfile.update({
            where: { id },
            data: { isVerified: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error verifying investor:', error);
        return NextResponse.json(
            { error: 'Investor not found' },
            { status: 404 }
        );
    }
}
