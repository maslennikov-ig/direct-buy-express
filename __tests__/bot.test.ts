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
            upsert: vi.fn().mockResolvedValue({ id: 'mock-user-id', role: 'OWNER' })
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
        expect(sendMessageParams?.payload.reply_markup?.inline_keyboard[0][0].callback_data).toBe('accept_terms');
    });

    it('should handle accept_terms callback_query', async () => {
        await bot.handleUpdate({
            update_id: 2,
            callback_query: {
                id: '1',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Welcome' },
                chat_instance: '123',
                data: 'accept_terms',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();

        const editMsg = methodCalls.find((c: any) => c.method === 'editMessageText');
        expect(editMsg).toBeDefined();
        expect(editMsg?.payload.text).toContain('Кто вы? Выберите роль');
        expect(editMsg?.payload.reply_markup.inline_keyboard.length).toBe(3);
    });

    it('should handle role_owner callback_query and enter conversation', async () => {
        await bot.handleUpdate({
            update_id: 3,
            callback_query: {
                id: '2',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Role' },
                chat_instance: '123',
                data: 'role_owner',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();
        // Since we mocked conversation, it won't send the first message, which is perfect.
        const sendMessageParams = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessageParams).toBeUndefined();
    });

    it('should handle role_broker callback_query and enter conversation', async () => {
        methodCalls = [];
        await bot.handleUpdate({
            update_id: 4,
            callback_query: {
                id: '3',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Role' },
                chat_instance: '123',
                data: 'role_broker',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();

        const sendMessageParams = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessageParams).toBeUndefined();
    });

    it('should handle role_investor callback_query and enter conversation', async () => {
        methodCalls = [];
        await bot.handleUpdate({
            update_id: 5,
            callback_query: {
                id: '4',
                from: { id: 123, is_bot: false, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 123, type: 'private' } as any, date: 1, text: 'Role' },
                chat_instance: '123',
                data: 'role_investor',
            }
        });

        const answerQuery = methodCalls.find((c: any) => c.method === 'answerCallbackQuery');
        expect(answerQuery).toBeDefined();

        const sendMessageParams = methodCalls.find((c: any) => c.method === 'sendMessage');
        expect(sendMessageParams).toBeUndefined();
    });
});
