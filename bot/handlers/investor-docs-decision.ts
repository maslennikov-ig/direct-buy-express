import { prisma } from '../../lib/db';
import type { Api } from 'grammy';

/**
 * Handle investor's decision on lot documents.
 * Called when investor clicks "Одобрить" or "Отклонить" inline button.
 *
 * Both decisions lead to MANAGER_HANDOFF — the manager takes over manually.
 * Uses atomic WHERE clause (status = INVESTOR_REVIEW) for idempotency (CR-1).
 */
export async function handleInvestorDocsDecision(
    lotId: string,
    decision: 'approved' | 'rejected',
    api: Api
): Promise<void> {
    // CR-1: Atomic update prevents double-click race condition
    const result = await prisma.lot.updateMany({
        where: { id: lotId, status: 'INVESTOR_REVIEW' },
        data: {
            status: 'MANAGER_HANDOFF',
            investorDecision: decision,
        },
    });

    // If already processed (double-click), skip notifications
    if (result.count === 0) {
        console.log(`Lot ${lotId}: already processed or not in INVESTOR_REVIEW. Skipping.`);
        return;
    }

    // Fetch lot details for notifications (after successful update)
    const lot = await prisma.lot.findUnique({
        where: { id: lotId },
        include: {
            owner: true,
            winner: true,
        },
    });

    if (!lot) return;

    // Notify Owner
    if (lot.owner?.telegramId) {
        try {
            const ownerMsg = decision === 'approved'
                ? '✅ Инвестор рассмотрел документы и готов к сделке. С вами свяжется менеджер для назначения встречи.'
                : '⚠️ У инвестора возникли вопросы по документам. С вами свяжется менеджер для уточнения деталей.';

            await api.sendMessage(Number(lot.owner.telegramId), ownerMsg);
        } catch (err) {
            console.error('Failed to notify owner:', err);
        }
    }

    // Notify Investor
    if (lot.winner?.telegramId) {
        try {
            const investorMsg = decision === 'approved'
                ? '👍 Спасибо! С вами свяжется менеджер для назначения встречи и оформления сделки.'
                : '📝 Спасибо за обратную связь. С вами свяжется менеджер для обсуждения дальнейших шагов.';

            await api.sendMessage(Number(lot.winner.telegramId), investorMsg);
        } catch (err) {
            console.error('Failed to notify investor:', err);
        }
    }

    // CR-2: Notify Manager via Telegram so they know to call clients
    const managerChatId = process.env.MANAGER_CHAT_ID;
    if (managerChatId) {
        try {
            const emoji = decision === 'approved' ? '✅' : '❌';
            await api.sendMessage(
                Number(managerChatId),
                `${emoji} Инвестор ${decision === 'approved' ? 'одобрил' : 'отклонил'} документы.\n\nЛот: ${lot.address}\nСобственник: ${lot.owner?.fullName || 'Неизвестно'}\nИнвестор: ${lot.winner?.fullName || 'Неизвестно'}\n\n👉 Свяжитесь с обеими сторонами.`
            );
        } catch (err) {
            console.error('Failed to notify manager:', err);
        }
    }

    console.log(`Lot ${lotId}: investor decision="${decision}" → MANAGER_HANDOFF`);
}
