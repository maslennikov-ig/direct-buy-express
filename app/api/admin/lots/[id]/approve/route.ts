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
            data: { status: 'INVESTOR_REVIEW' },
        });

        if (updateResult.count === 0) {
            return NextResponse.json(
                { error: 'Lot already processed' },
                { status: 400 }
            );
        }

        // Schedule SLA timer: 24h for investor to review docs
        try {
            const { slaQueue } = await import('@/lib/queue/client');
            await slaQueue.add('SLA_INVESTOR_REVIEW', { lotId: id }, {
                delay: 24 * 60 * 60 * 1000, // 24 hours
                removeOnComplete: true,
                jobId: `sla-investor-review-${id}`
            });
        } catch (err) {
            logger.error({ err, lotId: id, action: 'schedule-sla-investor-review' }, 'Failed to schedule SLA_INVESTOR_REVIEW');
        }

        // Get all media for this lot
        const media = await prisma.media.findMany({
            where: { lotId: id },
        });

        // Notify owner: docs approved by manager, forwarded to investor
        if (lot.owner?.telegramId) {
            try {
                await bot.api.sendMessage(
                    Number(lot.owner.telegramId),
                    '✅ Менеджер одобрил ваши документы. Они отправлены инвестору на рассмотрение.'
                );
            } catch (err) {
                logger.error({ err, telegramId: Number(lot.owner.telegramId), lotId: id }, 'Failed to notify owner about approval');
            }
        }

        // Forward documents to winning investor with decision buttons
        if (lot.winner?.telegramId) {
            try {
                const investorTgId = Number(lot.winner.telegramId);

                // Send summary message with document list
                const docTypes: Record<string, string> = {
                    EGRN: '📋 Выписка ЕГРН',
                    PASSPORT: '🪪 Паспорт собственника',
                    OWNERSHIP_DOC: '📄 Документ основания',
                    PRIVATIZATION_REFUSAL: '📝 Отказ от приватизации',
                };

                const docList = media
                    .map(m => docTypes[m.type] || m.type)
                    .join('\n');

                await bot.api.sendMessage(
                    investorTgId,
                    `📄 Документы по лоту "${lot.address}" прошли проверку менеджером.\n\nПрикреплённые документы:\n${docList}\n\nПожалуйста, ознакомьтесь и примите решение:`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '✅ Одобрить документы', callback_data: `investor_docs_approve_${id}` },
                                ],
                                [
                                    { text: '❌ Отклонить документы', callback_data: `investor_docs_reject_${id}` },
                                ],
                            ],
                        },
                    }
                );
            } catch (err) {
                logger.error({ err, telegramId: Number(lot.winner.telegramId), lotId: id }, 'Failed to notify investor about approval');
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, lotId: id }, 'Error approving lot');
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
