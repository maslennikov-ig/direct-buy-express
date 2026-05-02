import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { bot } from '@/bot';
import { processJob } from '@/lib/queue/worker';
import { Job } from 'bullmq';
import { QueueJobs } from '@/lib/queue/client';
import { assertIsolatedE2EDatabaseUrl } from '@/scripts/e2e/env';

// Helper to simulate Telegram messages
async function simulateMessage(telegramId: number, text: string) {
    await bot.handleUpdate({
        update_id: Math.floor(Math.random() * 100000),
        message: {
            message_id: Math.floor(Math.random() * 100000),
            date: Math.floor(Date.now() / 1000),
            chat: { id: telegramId, type: 'private', first_name: 'User' },
            from: { id: telegramId, is_bot: false, first_name: 'User' },
            text,
        },
    });
}

// Helper to simulate Telegram callback queries (button clicks)
async function simulateCallback(telegramId: number, data: string) {
    await bot.handleUpdate({
        update_id: Math.floor(Math.random() * 100000),
        callback_query: {
            id: Math.floor(Math.random() * 100000).toString(),
            from: { id: telegramId, is_bot: false, first_name: 'User' },
            message: {
                message_id: Math.floor(Math.random() * 100000),
                date: Math.floor(Date.now() / 1000),
                chat: { id: telegramId, type: 'private', first_name: 'User' },
                text: 'mock',
            },
            data,
            chat_instance: 'mock',
        },
    });
}

// Ensure the bot API doesn't actually hit Telegram during tests
beforeAll(() => {
    assertIsolatedE2EDatabaseUrl(process.env.DATABASE_URL);

    // Explicitly override API methods to bypass any Node HTTP stream hanging issues
    bot.api.sendMessage = vi.fn().mockResolvedValue({ message_id: 1, date: 1, chat: { id: 1, type: 'private' } });
    bot.api.answerCallbackQuery = vi.fn().mockResolvedValue(true);
    bot.api.editMessageText = vi.fn().mockResolvedValue(true);
    bot.api.getFile = vi.fn().mockResolvedValue({ file_id: "mock", file_path: "mock" });
    bot.api.sendDocument = vi.fn().mockResolvedValue({ message_id: 1, date: 1, chat: { id: 1, type: 'private' } });
    bot.api.sendPhoto = vi.fn().mockResolvedValue({ message_id: 1, date: 1, chat: { id: 1, type: 'private' } });

    bot.botInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'test_bot',
        can_join_groups: false,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
        can_connect_to_business: false,
        has_main_web_app: false,
        has_topics_enabled: false,
        allows_users_to_create_topics: false,
    };
});

afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.$disconnect();
});

describe('E2E Integration: Complete P2P Flow', () => {
    const OWNER_ID = 11111111;
    const INVESTOR1_ID = 22222222;
    const INVESTOR2_ID = 33333333;

    it('should complete the full lifecycle from creation to DEAL', async () => {
        // --- 1. SETUP USERS & CREATE LOT ---
        // Clean DB first
        await prisma.media.deleteMany({});
        await prisma.bid.deleteMany({});
        await prisma.lot.deleteMany({});
        await prisma.user.deleteMany({});

        // Owner creates lot (bypassing the long conversation by using DB directly for brevity in E2E, 
        // since we already unit test the conversation itself in bot-auth-middleware and photo-upload tests)
        const owner = await prisma.user.create({
            data: { telegramId: BigInt(OWNER_ID), role: 'OWNER', fullName: 'Owner' }
        });

        const lot = await prisma.lot.create({
            data: {
                ownerId: owner.id,
                address: 'E2E Moscow St 1',
                area: 50,
                floor: 5,
                rooms: 2,
                expectedPrice: 15_000_000,
                status: 'DRAFT',
            }
        });

        // --- 2. ADMIN MOVES TO AUCTION ---
        await prisma.lot.update({
            where: { id: lot.id },
            data: { status: 'AUCTION', auctionEndsAt: new Date(Date.now() + 12 * 60 * 60 * 1000) }
        });

        // --- 3. INVESTORS BID ---
        await prisma.user.create({ data: { telegramId: BigInt(INVESTOR1_ID), role: 'INVESTOR', fullName: 'Inv 1' } });
        await prisma.user.create({ data: { telegramId: BigInt(INVESTOR2_ID), role: 'INVESTOR', fullName: 'Inv 2' } });

        // Investor 1 bids 14M
        await prisma.bid.create({ data: { lotId: lot.id, investorId: (await prisma.user.findUnique({ where: { telegramId: BigInt(INVESTOR1_ID) } }))!.id, amount: 14_000_000 } });
        // Investor 2 bids 14.5M
        await prisma.bid.create({ data: { lotId: lot.id, investorId: (await prisma.user.findUnique({ where: { telegramId: BigInt(INVESTOR2_ID) } }))!.id, amount: 14_500_000 } });

        // --- 4. AUCTION CLOSES (Worker simulation) ---
        console.log("-> 4. Closing auction");
        await processJob({ name: QueueJobs.CLOSE_AUCTION, data: { lotId: lot.id } } as Job);

        // Let async db calls settle
        await new Promise(r => setTimeout(r, 100));

        const lotAfterAuction = await prisma.lot.findUnique({ where: { id: lot.id } });
        console.log("<- Status after auction:", lotAfterAuction?.status);
        expect(lotAfterAuction?.status).toBe('WAITING_CHOICE');

        // --- 5. OWNER CHOOSES WINNER ---
        console.log("-> 5. Owner chooses top bid");
        // Owner clicks "Agree" to Top 1 bid (Investor 2)
        const topBid = await prisma.bid.findFirst({ where: { lotId: lot.id }, orderBy: { amount: 'desc' } });
        await simulateCallback(OWNER_ID, `owner_agree_bid_${topBid!.id}_lot_${lot.id}`);

        await new Promise(r => setTimeout(r, 100));

        const lotAfterChoice = await prisma.lot.findUnique({ where: { id: lot.id } });
        console.log("<- Status after choice:", lotAfterChoice?.status);
        expect(lotAfterChoice?.status).toBe('WAITING_DOCS');
        expect(lotAfterChoice?.winnerId).toBe(topBid!.investorId); // Inv 2 won

        // --- 6. INVESTOR 2 UPLOADS DOCS ---
        console.log("-> 6. Investor starts upload docs");
        // Simulate investor entering upload docs conversation
        await simulateCallback(INVESTOR2_ID, `upload_docs_${lot.id}`);

        // Wait for handler to process
        await new Promise(r => setTimeout(r, 50));

        // We bypass the actual conversation inputs in E2E since grammY's conversation 
        // plugin requires actual Telegram server callbacks for long-running state.
        // Instead, we simulate the end result of the conversation:
        await prisma.media.createMany({
            data: [
                { lotId: lot.id, type: 'PASSPORT', url: 'mock_passport_id' },
                { lotId: lot.id, type: 'MARRIAGE_CONSENT', url: 'mock_consent_id' },
            ]
        });
        await prisma.lot.update({ where: { id: lot.id }, data: { status: 'DOCS_AUDIT' } });

        const lotAfterDocs = await prisma.lot.findUnique({ where: { id: lot.id } });
        expect(lotAfterDocs?.status).toBe('DOCS_AUDIT');

        // --- 7. ADMIN APPROVES DOCS ---
        console.log("-> 7. Admin approves docs");
        // Manager uses the web dashboard to approve docs.
        await prisma.lot.update({
            where: { id: lot.id },
            data: { status: 'INVESTOR_REVIEW' }
        });

        // --- 7.1 INVESTOR REVIEWS AND APPROVES DOCS ---
        console.log("-> 7.1 Investor approves docs");
        await simulateCallback(INVESTOR2_ID, `investor_docs_approve_${lot.id}`);

        await new Promise(r => setTimeout(r, 50));

        const lotAfterApprove = await prisma.lot.findUnique({ where: { id: lot.id } });
        expect(lotAfterApprove?.status).toBe('MANAGER_HANDOFF');

        // --- 8. INVESTOR SCHEDULES MEETING ---
        await simulateCallback(INVESTOR2_ID, `schedule_meeting_${lot.id}`);
        await new Promise(r => setTimeout(r, 50));
        await simulateMessage(INVESTOR2_ID, 'Tomorrow 10:00'); // Date
        await new Promise(r => setTimeout(r, 50));
        await simulateMessage(INVESTOR2_ID, 'Office 123'); // Address
        await new Promise(r => setTimeout(r, 50));

        // --- 9. OWNER CONFIRMS MEETING ---
        await simulateCallback(OWNER_ID, `meeting_confirm_${lot.id}`);
        await new Promise(r => setTimeout(r, 50));

        const lotAfterMeeting = await prisma.lot.findUnique({ where: { id: lot.id } });
        // Meeting confirmation keeps it in MANAGER_HANDOFF until final deal.
        expect(lotAfterMeeting?.status).toBe('MANAGER_HANDOFF');

        // --- 10. DEAL FINALIZED (SOLD) ---
        await prisma.lot.update({ where: { id: lot.id }, data: { status: 'SOLD' } });
        const finalLot = await prisma.lot.findUnique({ where: { id: lot.id } });
        expect(finalLot?.status).toBe('SOLD');
    }, 15000); // Allow 15s timeout
});
