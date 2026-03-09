import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { uploadDocsConversation } from '../bot/conversations/upload-docs';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findFirst: vi.fn(),
            update: vi.fn().mockResolvedValue({ id: 'lot-id' }),
        },
        media: {
            create: vi.fn().mockResolvedValue({ id: 'media-id' }),
        },
    }
}));

// Mock bot
vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn(),
        },
    },
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(false),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

// Mock queue client
vi.mock('../lib/queue/client', () => ({
    slaQueue: {
        remove: vi.fn(),
    },
}));

/**
 * Helper: creates a mock context object simulating a Telegram message.
 * Used as both the initial ctx and as return values from waitUntil/wait.
 */
function makePhotoCtx(fileId: string) {
    return {
        message: { photo: [{ file_id: fileId, width: 100, height: 100 }] },
        reply: vi.fn(),
        api: { getFile: vi.fn().mockResolvedValue({ file_path: 'photos/file.jpg' }) },
    };
}

function makeDocumentCtx(fileId: string, fileName = 'doc.pdf') {
    return {
        message: { document: { file_id: fileId, file_name: fileName } },
        reply: vi.fn(),
        api: { getFile: vi.fn().mockResolvedValue({ file_path: 'documents/file.pdf' }) },
    };
}

function makeTextCtx(text: string) {
    return {
        message: { text },
        reply: vi.fn(),
    };
}

describe('uploadDocsConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof uploadDocsConversation).toBe('function');
    });

    it('should collect 4 document types and update lot status to DOCS_AUDIT', async () => {
        const mockLot = {
            id: 'lot-123',
            ownerId: 'owner-1',
            winnerId: 'investor-1',
            status: 'WAITING_DOCS',
            owner: { telegramId: BigInt(111) },
            winner: { telegramId: BigInt(222) },
        };

        const { prisma } = await import('../lib/db');
        (prisma.lot.findFirst as any).mockResolvedValue(mockLot);

        const mockCtx = {
            from: { id: 111, first_name: 'Owner' },
            reply: vi.fn(),
            api: {
                getFile: vi.fn().mockResolvedValue({
                    file_path: 'photos/file_1.jpg',
                }),
            },
        } as any;

        // waitUntil returns contexts with photo/doc; wait returns text context for optional step
        const waitUntilResponses = [
            makePhotoCtx('egrn_photo_id'),     // 1. EGRN
            makePhotoCtx('passport_photo_id'), // 2. Passport
            makeDocumentCtx('ownership_doc_id'), // 3. Ownership doc
        ];
        let waitUntilIndex = 0;

        const mockConversation = {
            waitUntil: vi.fn().mockImplementation(() =>
                Promise.resolve(waitUntilResponses[waitUntilIndex++])
            ),
            wait: vi.fn().mockResolvedValue(makeTextCtx('нет')), // 4. Privatization = "нет"
            external: vi.fn().mockImplementation(async (cb: any) => await cb()),
        } as any;

        await uploadDocsConversation(mockConversation, mockCtx);

        // Should have created 3 Media records (no record for "нет" answer on privatization)
        expect(prisma.media.create).toHaveBeenCalledTimes(3);

        // Check EGRN media was created
        expect(prisma.media.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    lotId: 'lot-123',
                    type: 'EGRN',
                }),
            })
        );

        // Check PASSPORT media was created
        expect(prisma.media.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    lotId: 'lot-123',
                    type: 'PASSPORT',
                }),
            })
        );

        // Check OWNERSHIP_DOC media was created
        expect(prisma.media.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    lotId: 'lot-123',
                    type: 'OWNERSHIP_DOC',
                }),
            })
        );

        // Lot status updated to DOCS_AUDIT
        expect(prisma.lot.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'lot-123' },
                data: { status: 'DOCS_AUDIT' },
            })
        );

        // Owner notified via ctx.reply, investor via bot.api.sendMessage
        const { bot } = await import('../bot/index');
        expect(bot.api.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should accept privatization refusal document when user sends a file', async () => {
        const mockLot = {
            id: 'lot-456',
            ownerId: 'owner-2',
            winnerId: 'investor-2',
            status: 'WAITING_DOCS',
            owner: { telegramId: BigInt(333) },
            winner: { telegramId: BigInt(444) },
        };

        const { prisma } = await import('../lib/db');
        (prisma.lot.findFirst as any).mockResolvedValue(mockLot);

        const mockCtx = {
            from: { id: 333, first_name: 'Owner2' },
            reply: vi.fn(),
            api: {
                getFile: vi.fn().mockResolvedValue({
                    file_path: 'documents/file_2.pdf',
                }),
            },
        } as any;

        const waitUntilResponses = [
            makePhotoCtx('egrn_id'),
            makePhotoCtx('passport_id'),
            makeDocumentCtx('ownership_id', 'dkp.pdf'),
        ];
        let waitUntilIndex = 0;

        const mockConversation = {
            waitUntil: vi.fn().mockImplementation(() =>
                Promise.resolve(waitUntilResponses[waitUntilIndex++])
            ),
            // Privatization refusal sent as photo
            wait: vi.fn().mockResolvedValue(makePhotoCtx('refusal_id')),
            external: vi.fn().mockImplementation(async (cb: any) => await cb()),
        } as any;

        await uploadDocsConversation(mockConversation, mockCtx);

        // All 4 Media records created
        expect(prisma.media.create).toHaveBeenCalledTimes(4);

        expect(prisma.media.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    lotId: 'lot-456',
                    type: 'PRIVATIZATION_REFUSAL',
                }),
            })
        );
    });

    it('should return early if no lot found in WAITING_DOCS for this user', async () => {
        const { prisma } = await import('../lib/db');
        (prisma.lot.findFirst as any).mockResolvedValue(null);

        const mockCtx = {
            from: { id: 999 },
            reply: vi.fn(),
        } as any;

        const mockConversation = {
            waitUntil: vi.fn(),
            wait: vi.fn(),
            external: vi.fn().mockImplementation(async (cb: any) => await cb()),
        } as any;

        await uploadDocsConversation(mockConversation, mockCtx);

        expect(mockCtx.reply).toHaveBeenCalledWith(
            expect.stringContaining('нет лотов')
        );
        expect(prisma.media.create).not.toHaveBeenCalled();
    });

    it('should use waitUntil with otherwise callback for mandatory documents', async () => {
        const mockLot = {
            id: 'lot-789',
            ownerId: 'owner-3',
            winnerId: 'investor-3',
            status: 'WAITING_DOCS',
            owner: { telegramId: BigInt(555) },
            winner: { telegramId: BigInt(666) },
        };

        const { prisma } = await import('../lib/db');
        (prisma.lot.findFirst as any).mockResolvedValue(mockLot);

        const mockCtx = {
            from: { id: 555, first_name: 'Owner3' },
            reply: vi.fn(),
            api: {
                getFile: vi.fn().mockResolvedValue({
                    file_path: 'photos/file_3.jpg',
                }),
            },
        } as any;

        const waitUntilResponses = [
            makePhotoCtx('egrn_id'),
            makePhotoCtx('passport_id'),
            makeDocumentCtx('ownership_id'),
        ];
        let waitUntilIndex = 0;

        const mockConversation = {
            waitUntil: vi.fn().mockImplementation(() =>
                Promise.resolve(waitUntilResponses[waitUntilIndex++])
            ),
            wait: vi.fn().mockResolvedValue(makeTextCtx('нет')),
            external: vi.fn().mockImplementation(async (cb: any) => await cb()),
        } as any;

        await uploadDocsConversation(mockConversation, mockCtx);

        // Verify waitUntil was called 3 times (once per mandatory doc)
        // with a predicate function and otherwise option
        expect(mockConversation.waitUntil).toHaveBeenCalledTimes(3);

        // Each call should have a predicate fn and options with otherwise
        for (const call of mockConversation.waitUntil.mock.calls) {
            expect(typeof call[0]).toBe('function'); // predicate
            expect(call[1]).toHaveProperty('otherwise'); // otherwise callback
        }

        // wait() used only for the optional privatization step
        expect(mockConversation.wait).toHaveBeenCalledTimes(1);

        // All 3 mandatory Media records created
        expect(prisma.media.create).toHaveBeenCalledTimes(3);
    });
});
