import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { investorRegistrationConversation } from '../bot/conversations/investor-registration';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        user: {
            upsert: vi.fn().mockResolvedValue({ id: 'user-id' })
        },
        investorProfile: {
            upsert: vi.fn().mockResolvedValue({ id: 'investor-id' })
        }
    }
}));

describe('investorRegistrationConversation', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof investorRegistrationConversation).toBe('function');
    });

    it('should exit if NDA is rejected', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Investor Name' },
            reply: vi.fn(),
            callbackQuery: { data: 'nda_reject' },
            answerCallbackQuery: vi.fn(),
        } as any;

        const mockAnswers = [
            { callbackQuery: { data: 'nda_reject' }, answerCallbackQuery: vi.fn() }
        ];

        let waitIndex = 0;
        const mockConversation = {
            waitForCallbackQuery: vi.fn().mockImplementation(() => Promise.resolve(mockAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb: any) => await cb())
        } as any;

        await investorRegistrationConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Для продолжения работы в сервисе необходимо принять NDA'));
        const { prisma } = await import('../lib/db');
        expect(prisma.investorProfile.upsert).not.toHaveBeenCalled();
    });

    it('should process full registration flow correctly', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Investor Name' },
            reply: vi.fn(),
            callbackQuery: { data: 'nda_accept' },
            answerCallbackQuery: vi.fn(),
        } as any;

        const mockWaitAnswers = [
            { message: { text: '10000000' } },       // Min Budget
            { message: { text: '20000000' } },       // Max Budget
            { message: { text: 'ЦАО, Хамовники' } }  // Districts
        ];

        let waitIndex = 0;
        const mockConversation = {
            waitForCallbackQuery: vi.fn().mockResolvedValue({ callbackQuery: { data: 'nda_accept' }, answerCallbackQuery: vi.fn() }),
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockWaitAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb: any) => await cb())
        } as any;

        await investorRegistrationConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ваша анкета на модерации'));

        const { prisma } = await import('../lib/db');
        expect(prisma.investorProfile.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-id' },
                create: expect.objectContaining({
                    minBudget: expect.anything(),
                    maxBudget: expect.anything(),
                    districts: ['ЦАО', 'Хамовники']
                })
            })
        );
    });

    it('should ask again if budgets are invalid texts', async () => {
        const mockCtx = {
            from: { id: 12345, first_name: 'Investor Name' },
            reply: vi.fn(),
            callbackQuery: { data: 'nda_accept' },
            answerCallbackQuery: vi.fn(),
        } as any;

        const mockWaitAnswers = [
            { message: { text: 'Invalid' } },        // Min Budget Invalid
            { message: { text: '10000000' } },       // Min Budget Valid
            { message: { text: 'NotNumber' } },      // Max Budget Invalid
            { message: { text: '20000000' } },       // Max Budget Valid
            { message: { text: 'ЦАО' } }             // Districts
        ];

        let waitIndex = 0;
        const mockConversation = {
            waitForCallbackQuery: vi.fn().mockResolvedValue({ callbackQuery: { data: 'nda_accept' }, answerCallbackQuery: vi.fn() }),
            wait: vi.fn().mockImplementation(() => Promise.resolve(mockWaitAnswers[waitIndex++])),
            external: vi.fn().mockImplementation(async (cb: any) => await cb())
        } as any;

        await investorRegistrationConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Пожалуйста, введите сумму числом'));
        const { prisma } = await import('../lib/db');
        expect(prisma.investorProfile.upsert).toHaveBeenCalled();
    });
});
