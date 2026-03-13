import { Prisma } from '@prisma/client';
import type { MyConversation, MyContext } from '../types';
import { suggestAddress } from '../../lib/dadata';
import { prisma } from '../../lib/db';

const MIN_PHOTOS = 7;
const MAX_PHOTOS = 10;

export async function createLotConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    if (!ctx.from) return;

    await ctx.reply("🏠 Давайте создадим новый лот для скоростной продажи.\n\nВведите адрес продаваемого объекта (город, улица, дом):");
    const addressMsg = await conversation.wait();
    if (!addressMsg.message?.text) {
        await ctx.reply("Адрес не распознан. Операция прервана.");
        return;
    }
    let address = addressMsg.message.text;

    // Attempt DaData suggestion
    const suggestions = await conversation.external(() => suggestAddress(address));
    if (suggestions && suggestions.length > 0) {
        const bestMatch = suggestions[0].value;
        await ctx.reply(`Я нашел стандартизированный адрес:\n📍 ${bestMatch}\n\nЕсли он неверный, вы сможете отредактировать его позже.\n\nПродолжаем. Введите общую площадь в кв.м (например, 45.5):`);
        address = bestMatch;
    } else {
        await ctx.reply("Продолжаем. Введите общую площадь в кв.м (например, 45.5):");
    }

    // AREA
    let area = 0;
    while (true) {
        const areaMsg = await conversation.wait();
        const parsed = parseFloat(areaMsg.message?.text?.replace(',', '.') || "0");
        if (!isNaN(parsed) && parsed > 0) {
            area = parsed;
            break;
        }
        await ctx.reply("Пожалуйста, введите корректное число для площади (например, 45.5):");
    }

    // FLOOR
    await ctx.reply("Укажите этаж:");
    let floor = 0;
    while (true) {
        const floorMsg = await conversation.wait();
        const parsed = parseInt(floorMsg.message?.text || "", 10);
        if (!isNaN(parsed)) {
            floor = parsed;
            break;
        }
        await ctx.reply("Пожалуйста, введите корректный номер этажа (только число):");
    }

    // ROOMS
    await ctx.reply("Количество комнат (если студия, введите 0):");
    let rooms = 0;
    while (true) {
        const roomsMsg = await conversation.wait();
        const parsed = parseInt(roomsMsg.message?.text || "", 10);
        if (!isNaN(parsed) && parsed >= 0) {
            rooms = parsed;
            break;
        }
        await ctx.reply("Пожалуйста, введите корректное количество комнат (только число, 0 для студии):");
    }

    // LEGAL - DEBTS
    await ctx.reply("Есть ли долги по ЖКУ или капремонту? (Да/Нет)");
    let hasDebts: boolean | null = null;
    while (hasDebts === null) {
        const msg = await conversation.wait();
        const text = msg.message?.text?.trim().toLowerCase() ?? '';
        if (text === 'да' || text === 'yes') { hasDebts = true; }
        else if (text === 'нет' || text === 'no') { hasDebts = false; }
        else { await ctx.reply("Пожалуйста, ответьте «Да» или «Нет»."); }
    }

    // LEGAL - MORTGAGE
    await ctx.reply("Квартира в ипотеке/под обременением? (Да/Нет)");
    let hasMortgage: boolean | null = null;
    while (hasMortgage === null) {
        const msg = await conversation.wait();
        const text = msg.message?.text?.trim().toLowerCase() ?? '';
        if (text === 'да' || text === 'yes') { hasMortgage = true; }
        else if (text === 'нет' || text === 'no') { hasMortgage = false; }
        else { await ctx.reply("Пожалуйста, ответьте «Да» или «Нет»."); }
    }

    // LEGAL - REGISTERED
    await ctx.reply("Остались ли прописанные люди? (Да/Нет)");
    let hasRegistered: boolean | null = null;
    while (hasRegistered === null) {
        const msg = await conversation.wait();
        const text = msg.message?.text?.trim().toLowerCase() ?? '';
        if (text === 'да' || text === 'yes') { hasRegistered = true; }
        else if (text === 'нет' || text === 'no') { hasRegistered = false; }
        else { await ctx.reply("Пожалуйста, ответьте «Да» или «Нет»."); }
    }


    // PHOTOS (ТЗ §3 п.3: 7-10 обязательных фото)
    await ctx.reply(
        `📸 Время для фото!\n\n` +
        `Загрузите от ${MIN_PHOTOS} до ${MAX_PHOTOS} фотографий объекта ` +
        `(кухня, санузел, основные комнаты, вид из окна).\n\n` +
        `Отправьте фото одним или несколькими сообщениями.\n` +
        `Загружено: 0/${MIN_PHOTOS} (минимум)`
    );

    const photoFileIds: string[] = [];

    while (photoFileIds.length < MAX_PHOTOS) {
        const photoMsg = await conversation.wait();

        // Check for "done" signal
        if (photoMsg.message?.text?.toLowerCase() === 'готово' || photoMsg.message?.text?.toLowerCase() === 'done') {
            if (photoFileIds.length >= MIN_PHOTOS) {
                break;
            }
            await ctx.reply(`❗ Необходимо загрузить минимум ${MIN_PHOTOS} фото. Сейчас: ${photoFileIds.length}. Продолжайте загрузку.`);
            continue;
        }

        // Accept photos
        if (photoMsg.message?.photo && photoMsg.message.photo.length > 0) {
            // Telegram sends multiple sizes, take the largest
            const largestPhoto = photoMsg.message.photo[photoMsg.message.photo.length - 1];
            photoFileIds.push(largestPhoto.file_id);
        } else if (photoMsg.message?.document?.mime_type?.startsWith('image/')) {
            photoFileIds.push(photoMsg.message.document.file_id);
        } else {
            await ctx.reply("Пожалуйста, отправьте фотографию объекта.");
            continue;
        }

        if (photoFileIds.length >= MAX_PHOTOS) {
            await ctx.reply(`✅ Загружено ${photoFileIds.length} фото (максимум). Переходим дальше.`);
            break;
        } else if (photoFileIds.length >= MIN_PHOTOS) {
            await ctx.reply(
                `✅ Загружено ${photoFileIds.length}/${MAX_PHOTOS} фото.\n` +
                `Вы можете отправить ещё (до ${MAX_PHOTOS - photoFileIds.length}) или напишите «Готово» для продолжения.`
            );
        } else {
            const remaining = MIN_PHOTOS - photoFileIds.length;
            await ctx.reply(
                `📷 Загружено ${photoFileIds.length}/${MIN_PHOTOS} (минимум). Ещё ${remaining}.`
            );
        }
    }

    // FINANCIAL - PRICE
    await ctx.reply("Какую сумму (на руки) вы ожидаете получить? (в рублях)");
    let expectedPrice;
    while (true) {
        const priceMsg = await conversation.wait();
        const expectedPriceStr = priceMsg.message?.text?.replace(/\D/g, '') || "";
        if (expectedPriceStr.length > 0) {
            expectedPrice = new Prisma.Decimal(expectedPriceStr);
            break;
        }
        await ctx.reply("Пожалуйста, введите сумму числом (например, 15000000):");
    }

    // CONTEXT - URGENCY
    await ctx.reply("Почему необходимо продать срочно? (Например: Встречная сделка, долги, переезд)");
    const urgencyMsg = await conversation.wait();
    const urgencyReason = urgencyMsg.message?.text || "";

    // FINAL: SAVE TO DB
    await ctx.reply("⏳ Сохраняю данные лота...");

    try {
        await conversation.external(async () => {
            // Upsert the user to ensure owner connection exists
            const user = await prisma.user.upsert({
                where: { telegramId: ctx.from!.id },
                update: {},
                create: {
                    telegramId: ctx.from!.id,
                    role: 'OWNER',
                    fullName: ctx.from?.first_name || 'Anonymous',
                }
            });

            const lot = await prisma.lot.create({
                data: {
                    ownerId: user.id,
                    address,
                    area,
                    floor,
                    rooms,
                    hasDebts,
                    hasMortgage,
                    hasRegistered,
                    expectedPrice,
                    urgencyReason,
                    status: 'DRAFT'
                }
            });

            // Save photo Media records
            if (photoFileIds.length > 0) {
                await prisma.media.createMany({
                    data: photoFileIds.map((fileId) => ({
                        lotId: lot.id,
                        type: 'PHOTO',
                        url: fileId, // Store Telegram file_id; download on demand
                    })),
                });
            }
        });

        await ctx.reply(`✅ Лот успешно сохранен как ЧЕРНОВИК (${photoFileIds.length} фото).\n\nМенеджер скоро свяжется с вами для верификации документов, после чего мы запустим слепой аукцион среди инвесторов.`);
    } catch (e) {
        console.error("Lot creation error:", e);
        await ctx.reply("❌ Произошла ошибка при сохранении. Попробуйте снова позже.");
    }
}

