/**
 * Seed script for admin "Заявки (Аукционы)" page test data.
 * Creates linked Users, InvestorProfiles, Lots, Bids, and Media
 * in all relevant statuses: DOCS_AUDIT, MANAGER_HANDOFF, SOLD, CANCELED.
 *
 * Run: pnpm ts-node prisma/seed.ts
 * or: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding test data for admin lots page...');

    // ─── 1. Clean up existing seed data ────────────────────────────────────────
    await prisma.media.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.lot.deleteMany({});
    await prisma.investorProfile.deleteMany({});
    await prisma.user.deleteMany({});

    // ─── 2. Create Users ────────────────────────────────────────────────────────

    // Owners (sellers)
    const owner1 = await prisma.user.create({
        data: {
            telegramId: 100000001n,
            role: 'OWNER',
            fullName: 'Иванов Александр Петрович',
            phone: '+7 (916) 123-45-67',
        },
    });

    const owner2 = await prisma.user.create({
        data: {
            telegramId: 100000002n,
            role: 'OWNER',
            fullName: 'Смирнова Елена Викторовна',
            phone: '+7 (926) 987-65-43',
        },
    });

    const owner3 = await prisma.user.create({
        data: {
            telegramId: 100000003n,
            role: 'OWNER',
            fullName: 'Козлов Дмитрий Игоревич',
            phone: '+7 (985) 555-11-22',
        },
    });

    const owner4 = await prisma.user.create({
        data: {
            telegramId: 100000004n,
            role: 'OWNER',
            fullName: 'Новикова Татьяна Сергеевна',
            phone: '+7 (903) 444-77-88',
        },
    });

    // Investors (buyers)
    const investor1 = await prisma.user.create({
        data: {
            telegramId: 200000001n,
            role: 'INVESTOR',
            fullName: 'Петров Михаил Андреевич',
            phone: '+7 (495) 111-22-33',
            investorProfile: {
                create: {
                    minBudget: 7_000_000,
                    maxBudget: 15_000_000,
                    districts: ['Москва', 'Подмосковье'],
                    isVerified: true,
                },
            },
        },
        include: { investorProfile: true },
    });

    const investor2 = await prisma.user.create({
        data: {
            telegramId: 200000002n,
            role: 'INVESTOR',
            fullName: 'Федорова Ирина Константиновна',
            phone: '+7 (499) 333-44-55',
            investorProfile: {
                create: {
                    minBudget: 5_000_000,
                    maxBudget: 10_000_000,
                    districts: ['Москва'],
                    isVerified: true,
                },
            },
        },
        include: { investorProfile: true },
    });

    const investor3 = await prisma.user.create({
        data: {
            telegramId: 200000003n,
            role: 'INVESTOR',
            fullName: 'Романов Сергей Юрьевич',
            phone: '+7 (999) 777-88-99',
            investorProfile: {
                create: {
                    minBudget: 10_000_000,
                    maxBudget: 25_000_000,
                    districts: ['Москва', 'Санкт-Петербург'],
                    isVerified: false,
                },
            },
        },
        include: { investorProfile: true },
    });

    console.log('✓ Users created:', 4, 'owners +', 3, 'investors');

    // ─── 3. Create Lots ─────────────────────────────────────────────────────────

    // Lot 1: DOCS_AUDIT — документы загружены, ожидает проверки менеджером
    const lot1 = await prisma.lot.create({
        data: {
            ownerId: owner1.id,
            winnerId: investor1.id,
            address: 'Москва, ул. Арбат, д. 24, кв. 15',
            area: 68.5,
            floor: 5,
            rooms: 3,
            hasDebts: false,
            hasMortgage: false,
            hasRegistered: true,
            expectedPrice: 12_500_000,
            urgencyReason: 'Переезд за рубеж, срочно нужны средства',
            status: 'DOCS_AUDIT',
            auctionEndsAt: new Date('2026-02-28T18:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor1.id, amount: 11_000_000 },
                        { investorId: investor2.id, amount: 10_500_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot1/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot1/passport.jpg' },
                        { type: 'OWNERSHIP_DOC', url: '/uploads/lot1/ownership.pdf' },
                        { type: 'PRIVATIZATION_REFUSAL', url: '/uploads/lot1/refusal.pdf' },
                    ],
                },
            },
        },
    });

    // Lot 2: DOCS_AUDIT — ещё один лот на аудите с ипотекой
    const lot2 = await prisma.lot.create({
        data: {
            ownerId: owner2.id,
            winnerId: investor2.id,
            address: 'Москва, Кутузовский проспект, д. 36, кв. 88',
            area: 45.2,
            floor: 12,
            rooms: 2,
            hasDebts: false,
            hasMortgage: true,
            hasRegistered: false,
            expectedPrice: 8_900_000,
            urgencyReason: 'Развод, раздел имущества',
            status: 'DOCS_AUDIT',
            auctionEndsAt: new Date('2026-03-01T12:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor2.id, amount: 8_000_000 },
                        { investorId: investor3.id, amount: 7_800_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot2/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot2/passport.jpg' },
                        { type: 'MARRIAGE_CERT', url: '/uploads/lot2/marriage.pdf' },
                    ],
                },
            },
        },
    });

    // Lot 3: MANAGER_HANDOFF — инвестор одобрил, ждёт звонка менеджера
    const lot3 = await prisma.lot.create({
        data: {
            ownerId: owner3.id,
            winnerId: investor1.id,
            address: 'Москва, ул. Большая Дорогомиловская, д. 5, кв. 42',
            area: 78.0,
            floor: 3,
            rooms: 3,
            hasDebts: true,
            hasMortgage: false,
            hasRegistered: true,
            expectedPrice: 14_200_000,
            urgencyReason: 'Долги по ЖКХ, нужно срочно закрыть',
            status: 'MANAGER_HANDOFF',
            investorDecision: 'approved',
            auctionEndsAt: new Date('2026-02-25T18:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor1.id, amount: 13_500_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot3/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot3/passport.jpg' },
                        { type: 'OWNERSHIP_DOC', url: '/uploads/lot3/ownership.pdf' },
                    ],
                },
            },
        },
    });

    // Lot 4: MANAGER_HANDOFF — инвестор отклонил
    const lot4 = await prisma.lot.create({
        data: {
            ownerId: owner4.id,
            winnerId: investor3.id,
            address: 'Подмосковье, г. Химки, ул. Ленинградская, д. 12, кв. 7',
            area: 52.0,
            floor: 1,
            rooms: 2,
            hasDebts: false,
            hasMortgage: false,
            hasRegistered: false,
            expectedPrice: 6_800_000,
            urgencyReason: 'Получено наследство, нужна ликвидность',
            status: 'MANAGER_HANDOFF',
            investorDecision: 'rejected',
            auctionEndsAt: new Date('2026-03-02T10:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor3.id, amount: 6_200_000 },
                        { investorId: investor2.id, amount: 6_050_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot4/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot4/passport.jpg' },
                    ],
                },
            },
        },
    });

    // Lot 5: SOLD — успешная сделка
    const lot5 = await prisma.lot.create({
        data: {
            ownerId: owner1.id,
            winnerId: investor2.id,
            address: 'Москва, ул. Тверская, д. 9, кв. 103',
            area: 91.3,
            floor: 7,
            rooms: 4,
            hasDebts: false,
            hasMortgage: false,
            hasRegistered: true,
            expectedPrice: 18_000_000,
            urgencyReason: null,
            status: 'SOLD',
            auctionEndsAt: new Date('2026-02-15T18:00:00Z'),
            createdAt: new Date('2026-02-10T10:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor2.id, amount: 16_500_000 },
                        { investorId: investor1.id, amount: 16_200_000 },
                        { investorId: investor3.id, amount: 15_800_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot5/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot5/passport.jpg' },
                        { type: 'OWNERSHIP_DOC', url: '/uploads/lot5/ownership.pdf' },
                    ],
                },
            },
        },
    });

    // Lot 6: SOLD — ещё одна успешная сделка
    const lot6 = await prisma.lot.create({
        data: {
            ownerId: owner3.id,
            winnerId: investor1.id,
            address: 'Москва, Ленинский проспект, д. 56, кв. 22',
            area: 63.0,
            floor: 9,
            rooms: 3,
            hasDebts: false,
            hasMortgage: true,
            hasRegistered: false,
            expectedPrice: 11_000_000,
            urgencyReason: 'Ипотека, сложная ситуация',
            status: 'SOLD',
            auctionEndsAt: new Date('2026-01-20T18:00:00Z'),
            createdAt: new Date('2026-01-14T09:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor1.id, amount: 9_900_000 },
                        { investorId: investor3.id, amount: 9_700_000 },
                    ],
                },
            },
            media: {
                createMany: {
                    data: [
                        { type: 'EGRN', url: '/uploads/lot6/egrn.pdf' },
                        { type: 'PASSPORT', url: '/uploads/lot6/passport.jpg' },
                    ],
                },
            },
        },
    });

    // Lot 7: CANCELED — отменённая сделка
    const lot7 = await prisma.lot.create({
        data: {
            ownerId: owner2.id,
            winnerId: null,
            address: 'Москва, ул. Профсоюзная, д. 110, кв. 5',
            area: 34.0,
            floor: 2,
            rooms: 1,
            hasDebts: true,
            hasMortgage: true,
            hasRegistered: true,
            expectedPrice: 5_500_000,
            urgencyReason: 'Проблемы с документами',
            status: 'CANCELED',
            auctionEndsAt: new Date('2026-02-05T18:00:00Z'),
            createdAt: new Date('2026-01-30T14:00:00Z'),
            bids: {
                createMany: {
                    data: [
                        { investorId: investor2.id, amount: 5_000_000 },
                    ],
                },
            },
        },
    });

    console.log('✓ Lots created:');
    console.log('  - DOCS_AUDIT:', lot1.address);
    console.log('  - DOCS_AUDIT:', lot2.address);
    console.log('  - MANAGER_HANDOFF (approved):', lot3.address);
    console.log('  - MANAGER_HANDOFF (rejected):', lot4.address);
    console.log('  - SOLD:', lot5.address);
    console.log('  - SOLD:', lot6.address);
    console.log('  - CANCELED:', lot7.address);

    console.log('\n✅ Seeding complete!');
    console.log('  Lots created:', 7);
    console.log('  Users created:', 7, '(4 owners + 3 investors)');
    console.log('  Bids created:', [2, 2, 1, 2, 3, 2, 1].reduce((a, b) => a + b, 0));
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
