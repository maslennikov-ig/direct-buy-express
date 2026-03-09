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

        if (!lot || lot.status !== 'MANAGER_HANDOFF') {
            return NextResponse.json(
                { error: 'Lot not found or not in MANAGER_HANDOFF status' },
                { status: 404 }
            );
        }

        // Parse body for optional returnToAuction flag
        let returnToAuction = false;
        if (request.headers.get('content-type')?.includes('application/json')) {
            try {
                const body = await request.json();
                returnToAuction = body?.returnToAuction === true;
            } catch {
                // Ignore invalid JSON
            }
        }

        if (returnToAuction) {
            // Return to AUCTION with new 12h timer
            const auctionEndsAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
            const updateResult = await prisma.lot.updateMany({
                where: { id, status: 'MANAGER_HANDOFF' },
                data: {
                    status: 'AUCTION',
                    auctionEndsAt,
                },
            });

            if (updateResult.count === 0) {
                return NextResponse.json({ error: 'Lot already processed' }, { status: 400 });
            }

            // Schedule new CLOSE_AUCTION timer
            try {
                const { slaQueue } = await import('@/lib/queue/client');
                await slaQueue.add('CLOSE_AUCTION', { lotId: id }, {
                    delay: 12 * 60 * 60 * 1000,
                    removeOnComplete: true,
                    jobId: `close-auction-${id}`
                });
            } catch (err) {
                logger.error({ err, lotId: id, action: 'schedule-close-auction' }, 'Failed to schedule CLOSE_AUCTION');
            }

            // Notify Owner
            if (lot.owner?.telegramId) {
                try {
                    await bot.api.sendMessage(
                        Number(lot.owner.telegramId),
                        `🔄 Лот "${lot.address}" возвращён на повторный аукцион. Новый сбор предложений открыт на 12 часов.`
                    );
                } catch (err) {
                    logger.error({ err, telegramId: Number(lot.owner.telegramId), lotId: id }, 'Failed to notify Owner about canceled deal');
                }
            }

            // Notify Investor
            if (lot.winner?.telegramId) {
                try {
                    await bot.api.sendMessage(
                        Number(lot.winner.telegramId),
                        `🔄 Сделка по лоту "${lot.address}" отменена. Лот возвращён на аукцион.`
                    );
                } catch (err) {
                    console.error('Failed to notify investor about re-auction:', err);
                }
            }
        } else {
            // Cancel deal
            const updateResult = await prisma.lot.updateMany({
                where: { id, status: 'MANAGER_HANDOFF' },
                data: { status: 'CANCELED' },
            });

            if (updateResult.count === 0) {
                return NextResponse.json({ error: 'Lot already processed' }, { status: 400 });
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
                    await bot.api.sendMessage(
                        Number(lot.owner.telegramId),
                        `❌ Сделка по лоту "${lot.address}" отменена. Если у вас есть вопросы, свяжитесь с менеджером.`
                    );
                } catch (err) {
                    console.error('Failed to notify owner about cancellation:', err);
                }
            }

            // Notify Investor
            if (lot.winner?.telegramId) {
                try {
                    await bot.api.sendMessage(
                        Number(lot.winner.telegramId),
                        `❌ Сделка по лоту "${lot.address}" отменена. Если у вас есть вопросы, свяжитесь с менеджером.`
                    );
                } catch (err) {
                    console.error('Failed to notify investor about cancellation:', err);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error canceling deal:', error);
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
