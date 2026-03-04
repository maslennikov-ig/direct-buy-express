import { Prisma } from '@prisma/client';
import { MyConversation, MyContext } from '../index';
import { suggestAddress } from '../../lib/dadata';
import { prisma } from '../../lib/db';

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
        // For MVP, we pick the first suggestion to streamline, or you could ask the user to pick via inline keyboard.
        // Here we'll just show it to them for confirmation.
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
    const debtsMsg = await conversation.wait();
    const hasDebts = debtsMsg.message?.text?.toLowerCase().includes("да") || false;

    // LEGAL - MORTGAGE
    await ctx.reply("Квартира в ипотеке/под обременением? (Да/Нет)");
    const mortgageMsg = await conversation.wait();
    const hasMortgage = mortgageMsg.message?.text?.toLowerCase().includes("да") || false;

    // LEGAL - REGISTERED
    await ctx.reply("Остались ли прописанные люди? (Да/Нет)");
    const regMsg = await conversation.wait();
    const hasRegistered = regMsg.message?.text?.toLowerCase().includes("да") || false;

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

            await prisma.lot.create({
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
        });

        await ctx.reply("✅ Лот успешно сохранен как ЧЕРНОВИК.\n\nМенеджер скоро свяжется с вами для верификации документов, после чего мы запустим слепой аукцион среди инвесторов.");
    } catch (e) {
        console.error("Lot creation error:", e);
        await ctx.reply("❌ Произошла ошибка при сохранении. Попробуйте снова позже.");
    }
}
