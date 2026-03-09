import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bot } from '@/bot/index';
import { isAuthenticated } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAuthenticated()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const lot = await prisma.lot.findUnique({
            where: { id },
            include: {
                owner: true,
                winner: true,
            },
        });

        if (!lot || lot.status !== 'DOCS_AUDIT') {
            return NextResponse.json(
                { error: 'Lot not found or not in DOCS_AUDIT status' },
                { status: 404 }
            );
        }

        // Atomic status transition to prevent race conditions
        const updateResult = await prisma.lot.updateMany({
            where: { id, status: 'DOCS_AUDIT' },
            data: { status: 'WAITING_DOCS' },
        });

        if (updateResult.count === 0) {
            return NextResponse.json(
                { error: 'Lot already processed' },
                { status: 400 }
            );
        }

        // Notify owner
        if (lot.owner?.telegramId) {
            try {
                await bot.api.sendMessage(
                    Number(lot.owner.telegramId),
                    '❌ Документы отклонены. С вами свяжется менеджер для уточнения деталей.'
                );
            } catch (err) {
                logger.error({ err, telegramId: Number(lot.owner.telegramId), lotId: id }, 'Failed to notify owner about rejection');
            }
        }

        // Notify investor
        if (lot.winner?.telegramId) {
            try {
                await bot.api.sendMessage(
                    Number(lot.winner.telegramId),
                    '⚠️ Документы по лоту отклонены менеджером. Ожидайте повторную загрузку от собственника.'
                );
            } catch (err) {
                logger.error({ err, telegramId: Number(lot.winner.telegramId), lotId: id }, 'Failed to notify investor about rejection');
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, lotId: id }, 'Error rejecting lot');
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
