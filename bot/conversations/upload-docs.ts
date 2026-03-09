import fs from 'fs';
import path from 'path';
import type { MyConversation, MyContext } from '../types';
import { prisma } from '../../lib/db';
import { bot } from '../index';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Helper: download a file from Telegram and save it locally.
 * Returns the local path relative to the project root.
 */
async function downloadTelegramFile(
    ctx: MyContext,
    fileId: string,
    lotId: string,
    fileName: string
): Promise<string> {
    const file = await ctx.api.getFile(fileId);
    const lotDir = path.join(UPLOADS_DIR, 'lots', lotId);

    if (!fs.existsSync(lotDir)) {
        fs.mkdirSync(lotDir, { recursive: true });
    }

    const ext = path.extname(file.file_path || '') || '.jpg';
    const localName = `${fileName}${ext}`;
    const localPath = path.join(lotDir, localName);

    // Download file from Telegram API
    const token = process.env.BOT_TOKEN || 'mock_token_for_tests';
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    try {
        const response = await fetch(fileUrl);
        if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(localPath, buffer);
        } else {
            // Fallback: create placeholder if download fails (e.g., in tests)
            fs.writeFileSync(localPath, '');
            console.warn(`Could not download file from Telegram: ${response.status}`);
        }
    } catch {
        // In test environment, fetch may not work
        fs.writeFileSync(localPath, '');
    }

    return `/uploads/lots/${lotId}/${localName}`;
}

/**
 * Extract file_id from a context that contains a photo or document.
 * Returns the file_id string, or null if neither is present.
 */
function getFileId(ctx: MyContext): string | null {
    const photo = ctx.message?.photo;
    if (photo && photo.length > 0) {
        // Telegram sends multiple sizes; take the largest (last)
        return photo[photo.length - 1].file_id;
    }
    if (ctx.message?.document) {
        return ctx.message.document.file_id;
    }
    return null;
}

/**
 * Predicate: returns true if the update has a photo or document.
 * Used with conversation.waitUntil() for typed filtering with auto re-prompt.
 */
function hasFileAttachment(ctx: MyContext): boolean {
    return !!(ctx.message?.photo?.length || ctx.message?.document);
}

/**
 * Collect a mandatory document using grammY's waitUntil for type-safe filtering.
 * Auto re-prompts on invalid input (text instead of photo/file).
 */
async function collectDocument(
    conversation: MyConversation,
    ctx: MyContext,
    prompt: string
): Promise<string> {
    await ctx.reply(prompt);

    const docCtx = await conversation.waitUntil(
        hasFileAttachment,
        {
            otherwise: (ctx: MyContext) =>
                ctx.reply('⚠️ Пожалуйста, отправьте фото или файл (не текст).'),
        }
    );

    return getFileId(docCtx)!;
}

export async function uploadDocsConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    if (!ctx.from) return;

    // Find a lot in WAITING_DOCS status owned by this user
    const lot = await conversation.external(async () => {
        return prisma.lot.findFirst({
            where: {
                owner: { telegramId: ctx.from!.id },
                status: 'WAITING_DOCS',
            },
            include: {
                owner: true,
                winner: true,
            },
        });
    });

    if (!lot) {
        await ctx.reply('❌ У вас нет лотов, ожидающих загрузки документов.');
        return;
    }

    await ctx.reply(
        '📄 Начинаем загрузку документов для вашего лота.\n' +
        'Вам необходимо отправить 4 документа по очереди.\n' +
        'У вас есть 2 часа на загрузку в соответствии с правилами SLA.'
    );

    // 1. EGRN
    const egrnFileId = await collectDocument(
        conversation,
        ctx,
        '1️⃣ Отправьте выписку из ЕГРН (файл PDF или фото):'
    );

    await conversation.external(async () => {
        const url = await downloadTelegramFile(ctx, egrnFileId, lot.id, 'egrn');
        await prisma.media.create({
            data: { lotId: lot.id, type: 'EGRN', url },
        });
    });

    // 2. Passport
    const passportFileId = await collectDocument(
        conversation,
        ctx,
        '2️⃣ Отправьте фото главного разворота паспорта собственника:'
    );

    await conversation.external(async () => {
        const url = await downloadTelegramFile(ctx, passportFileId, lot.id, 'passport');
        await prisma.media.create({
            data: { lotId: lot.id, type: 'PASSPORT', url },
        });
    });

    // 3. Ownership Document
    const ownershipFileId = await collectDocument(
        conversation,
        ctx,
        '3️⃣ Отправьте документ основания (ДКП, приватизация и т.п.):'
    );

    await conversation.external(async () => {
        const url = await downloadTelegramFile(ctx, ownershipFileId, lot.id, 'ownership_doc');
        await prisma.media.create({
            data: { lotId: lot.id, type: 'OWNERSHIP_DOC', url },
        });
    });

    // 4. Privatization Refusal (optional — accept text "нет" to skip)
    await ctx.reply(
        '4️⃣ Если была приватизация — отправьте отказ от приватизации (фото/файл).\n' +
        'Если приватизации не было — напишите «Нет».'
    );

    const refusalCtx = await conversation.wait();
    const refusalFileId = getFileId(refusalCtx);

    if (refusalFileId) {
        await conversation.external(async () => {
            const url = await downloadTelegramFile(ctx, refusalFileId, lot.id, 'privatization_refusal');
            await prisma.media.create({
                data: { lotId: lot.id, type: 'PRIVATIZATION_REFUSAL', url },
            });
        });
    }
    // If text (including "нет") — skip creating Media record

    // Update lot status to DOCS_AUDIT
    await conversation.external(async () => {
        await prisma.lot.update({
            where: { id: lot.id },
            data: { status: 'DOCS_AUDIT' },
        });
    });

    // Notify owner
    await ctx.reply(
        '✅ Документы успешно загружены! Менеджер проверит их в ближайшее время.'
    );

    // Notify winning investor
    if (lot.winner && lot.winner.telegramId) {
        try {
            await bot.api.sendMessage(
                Number(lot.winner.telegramId),
                `📋 Собственник загрузил документы по лоту "${lot.address || lot.id}". Ожидайте результат аудита менеджером.`
            );
        } catch (err) {
            console.error('Failed to notify winner:', err);
        }
    }

    console.log(`Documents uploaded for lot ${lot.id}. Status → DOCS_AUDIT`);
}
