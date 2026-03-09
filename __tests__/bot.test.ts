import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

vi.mock('@grammyjs/conversations', () => ({
    conversations: () => (ctx: any, next: any) => {
        ctx.conversation = { enter: vi.fn().mockResolvedValue(undefined) };
        return next();
    },
    createConversation: () => (ctx: any, next: any) => next()
}));

import { bot } from '../bot/index';

vi.mock('../lib/db', () => ({
    prisma: {
        user: {
            upsert: vi.fn().mockResolvedValue({ id: 'mock-user-id', role: 'OWNER' }),
            findUnique: vi.fn().mockResolvedValue(null), // /status: no lots yet
        }
    }
}));

let methodCalls: Array<{ method: string, payload: any }> = [];

// Mock required grammy variables
bot.botInfo = {
    id: 42,
    first_name: "Test Bot",
    is_bot: true,
    username: "test_bot",
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
} as any;

bot.api.config.use(async (prev, method, payload) => {
    methodCalls.push({ method, payload });
    if (method === 'sendMessage') return { ok: true, result: { message_id: 1, date: 1, chat: { id: 1, type: 'private' }, text: "mock" } } as any;
    if (method === 'answerCallbackQuery') return { ok: true, result: true } as any;
    if (method === 'editMessageText') return { ok: true, result: true } as any;
    return { ok: true, result: true } as any;
});


describe('Telegram Bot Foundation', () => {

    beforeEach(() => {
        methodCalls = [];
    });

    afterEach(() => {
        methodCalls = [];
    });

    it('should instantiate grammy bot', () => {
        expect(bot).toBeDefined();
        // Uses default mock token from process.env logic in bot/index.ts or fallback
    });

    it('should handle /start command', async () => {
        await bot.handleUpdate({
            update_id: 1,
            message: {
                message_id: 1,
                date: 123456789,
                chat: { id: 123, type: 'private' } as any,
                text: '/start',
                entities: [{ type: 'bot_command', offset: 0, length: 6 }],
                from: { id: 123, is_bot: false, first_name: 'Test' }
            }
        });

        const sendMessageParams = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessageParams).toBeDefined();
        expect(sendMessageParams?.payload.text).toContain('Добро пожаловать в Direct Buy');
        // Menu Plugin теперь управляет кнопками — проверяем только наличие reply_markup
        expect(sendMessageParams?.payload.reply_markup).toBeDefined();
        expect(sendMessageParams?.payload.reply_markup?.inline_keyboard).toBeDefined();
    });

    it('should handle bid_lot_ callback_query and enter makeBidConversation', async () => {
        await bot.handleUpdate({
            update_id: 2,
            callback_query: {
                id: '1',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Auction' },
                chat_instance: '123',
                data: 'bid_lot_abc123',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();
        // conversation.enter is mocked — no real message is sent
        const sendMessage = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessage).toBeUndefined();
    });

    it('should handle upload_docs_ callback_query and enter uploadDocsConversation', async () => {
        methodCalls = [];
        await bot.handleUpdate({
            update_id: 3,
            callback_query: {
                id: '2',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Docs' },
                chat_instance: '123',
                data: 'upload_docs_abc123',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();
    });

    it('should handle /status command', async () => {
        methodCalls = [];
        await bot.handleUpdate({
            update_id: 4,
            message: {
                message_id: 2,
                date: 123456789,
                chat: { id: 123, type: 'private' } as any,
                text: '/status',
                entities: [{ type: 'bot_command', offset: 0, length: 7 }],
                from: { id: 123, is_bot: false, first_name: 'Test' }
            }
        });

        const sendMessage = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessage).toBeDefined();
    });

    it('should handle /help command', async () => {
        methodCalls = [];
        await bot.handleUpdate({
            update_id: 5,
            message: {
                message_id: 3,
                date: 123456789,
                chat: { id: 123, type: 'private' } as any,
                text: '/help',
                entities: [{ type: 'bot_command', offset: 0, length: 5 }],
                from: { id: 123, is_bot: false, first_name: 'Test' }
            }
        });

        const sendMessage = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessage).toBeDefined();
        expect(sendMessage?.payload.text).toContain('Помощь и поддержка');
    });
});
