import { logger } from './logger';
import type { Api } from 'grammy';

/**
 * Parse MANAGER_CHAT_ID env variable (supports comma-separated IDs).
 * Example: "82003266,166848328"
 */
export function getManagerChatIds(): number[] {
    const raw = process.env.MANAGER_CHAT_ID;
    if (!raw) return [];
    return raw
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .map(Number)
        .filter(id => !isNaN(id));
}

/**
 * Send a message to all configured managers.
 * Accepts a grammy Api instance to work in both bot and handler contexts.
 * Errors for individual managers are logged but don't throw.
 */
export async function notifyManagers(api: Api, message: string, context?: string): Promise<void> {
    const ids = getManagerChatIds();
    if (ids.length === 0) {
        logger.warn({ context }, 'MANAGER_CHAT_ID is not set, skipping manager notification');
        return;
    }

    await Promise.allSettled(
        ids.map(async (chatId) => {
            try {
                await api.sendMessage(chatId, message);
            } catch (err) {
                logger.error({ err, chatId, context }, 'Failed to notify manager');
            }
        })
    );
}
