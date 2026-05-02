import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

        if (!lot || lot.status !== 'MANAGER_HANDOFF') {
            return NextResponse.json(
                { error: 'Lot not found or not in MANAGER_HANDOFF status' },
                { status: 404 }
            );
        }

        const updateResult = await prisma.lot.updateMany({
            where: { id, status: 'MANAGER_HANDOFF' },
            data: { status: 'SOLD' },
        });

        if (updateResult.count === 0) {
            return NextResponse.json(
                { error: 'Lot already processed' },
                { status: 400 }
            );
        }

        // Gracefully clean up any pending SLA timers concurrently
        try {
            const { slaQueue } = await import('@/lib/queue/client');
            await Promise.allSettled([
                slaQueue.remove(`sla-docs-upload-${id}`),
                slaQueue.remove(`sla-investor-review-${id}`),
                slaQueue.remove(`close-auction-${id}`)
            ]);
        } catch (err) {
            logger.error({ err, lotId: id, action: 'cleanup-sla-timers' }, 'Failed to cleanup SLA timers');
        }

        // Notify Owner
        if (lot.owner?.telegramId) {
            try {
                const { bot } = await import('@/bot/index');
                await bot.api.sendMessage(
                    Number(lot.owner.telegramId),
                    `🎉 Сделка по лоту "${lot.address}" успешно завершена! Спасибо за использование Direct Buy.`
                );
            } catch (err) {
                logger.error({ err, telegramId: Number(lot.owner.telegramId), lotId: id }, 'Failed to notify Owner about completed deal');
            }
        }

        // Notify Investor
        if (lot.winner?.telegramId) {
            try {
                const { bot } = await import('@/bot/index');
                await bot.api.sendMessage(
                    Number(lot.winner.telegramId),
                    `🎉 Сделка по лоту "${lot.address}" успешно завершена! Спасибо за использование Direct Buy.`
                );
            } catch (err) {
                console.error('Failed to notify investor about deal completion:', err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error completing deal:', error);
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
