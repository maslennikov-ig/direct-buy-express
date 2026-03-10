/**
 * Seed script — complete test data for all admin sections.
 * Run: npx tsx prisma/seed.ts (must have DATABASE_URL set)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding all admin test data...');
    await prisma.media.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.lot.deleteMany({});
    await prisma.investorProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.setting.deleteMany({});

    await prisma.setting.createMany({
        data: [
            { key: 'MANAGER_CHAT_ID', value: '82003266,166848328' },
            { key: 'PLATFORM_FEE_RUB', value: '100000' },
            { key: 'SLA_DOCS_UPLOAD_HOURS', value: '2' },
            { key: 'SLA_INVESTOR_REVIEW_HOURS', value: '24' },
            { key: 'SLA_OFFER_RESPONSE_HOURS', value: '2' },
            { key: 'BOT_ACTIVE', value: 'true' },
        ],
    });
    console.log('✓ Settings seeded');

    const [owner1, owner2, owner3, owner4, owner5, owner6] = await Promise.all([
        prisma.user.create({ data: { telegramId: 100000001n, role: 'OWNER', fullName: 'Иванов Александр Петрович', phone: '+7 (916) 123-45-67' } }),
        prisma.user.create({ data: { telegramId: 100000002n, role: 'OWNER', fullName: 'Смирнова Елена Викторовна', phone: '+7 (926) 987-65-43' } }),
        prisma.user.create({ data: { telegramId: 100000003n, role: 'OWNER', fullName: 'Козлов Дмитрий Игоревич', phone: '+7 (985) 555-11-22' } }),
        prisma.user.create({ data: { telegramId: 100000004n, role: 'OWNER', fullName: 'Новикова Татьяна Сергеевна', phone: '+7 (903) 444-77-88' } }),
        prisma.user.create({ data: { telegramId: 100000005n, role: 'OWNER', fullName: 'Захаров Павел Николаевич', phone: '+7 (917) 321-00-11' } }),
        prisma.user.create({ data: { telegramId: 100000006n, role: 'OWNER', fullName: 'Лебедева Ольга Андреевна', phone: '+7 (929) 888-44-22' } }),
    ]);

    const inv1 = await prisma.user.create({ data: { telegramId: 200000001n, role: 'INVESTOR', fullName: 'Петров Михаил Андреевич', phone: '+7 (495) 111-22-33', investorProfile: { create: { minBudget: 7000000, maxBudget: 15000000, districts: ['Москва', 'Подмосковье'], isVerified: true } } } });
    const inv2 = await prisma.user.create({ data: { telegramId: 200000002n, role: 'INVESTOR', fullName: 'Федорова Ирина Константиновна', phone: '+7 (499) 333-44-55', investorProfile: { create: { minBudget: 5000000, maxBudget: 10000000, districts: ['Москва'], isVerified: true } } } });
    const inv3 = await prisma.user.create({ data: { telegramId: 200000003n, role: 'INVESTOR', fullName: 'Романов Сергей Юрьевич', phone: '+7 (999) 777-88-99', investorProfile: { create: { minBudget: 10000000, maxBudget: 25000000, districts: ['Москва', 'Санкт-Петербург'], isVerified: true } } } });
    await prisma.user.create({ data: { telegramId: 200000004n, role: 'INVESTOR', fullName: 'Алексей Смирнов', phone: '+7 (999) 123-45-67', investorProfile: { create: { minBudget: 5000000, maxBudget: 12000000, districts: ['Москва', 'ЦАО'], isVerified: false } } } });
    await prisma.user.create({ data: { telegramId: 200000005n, role: 'INVESTOR', fullName: 'Мария Козлова', phone: '+7 (916) 555-33-22', investorProfile: { create: { minBudget: 8000000, maxBudget: 20000000, districts: ['Санкт-Петербург', 'Центр'], isVerified: false } } } });
    await prisma.user.create({ data: { telegramId: 200000006n, role: 'INVESTOR', fullName: 'Дмитрий Волков', phone: '+7 (905) 777-88-99', investorProfile: { create: { minBudget: 3000000, maxBudget: 7000000, districts: ['Подмосковье'], isVerified: false } } } });
    console.log('✓ Users: 6 owners, 3 verified investors, 3 unverified investors');

    // AUCTION
    await prisma.lot.create({ data: { ownerId: owner5.id, address: 'Москва, ул. Садовая-Кудринская, д. 8, кв. 31', area: 55.0, floor: 4, rooms: 2, hasDebts: false, hasMortgage: false, hasRegistered: false, expectedPrice: 9500000, urgencyReason: 'Переезд в регионы', status: 'AUCTION', auctionEndsAt: new Date(Date.now() + 24*60*60*1000), bids: { createMany: { data: [{ investorId: inv1.id, amount: 8500000 }, { investorId: inv2.id, amount: 8300000 }] } } } });
    await prisma.lot.create({ data: { ownerId: owner6.id, address: 'Москва, Проспект Мира, д. 45, кв. 12', area: 72.5, floor: 8, rooms: 3, hasDebts: false, hasMortgage: true, hasRegistered: true, expectedPrice: 13000000, urgencyReason: 'Срочная продажа, ипотека', status: 'AUCTION', auctionEndsAt: new Date(Date.now() + 6*60*60*1000), bids: { createMany: { data: [{ investorId: inv3.id, amount: 11700000 }] } } } });

    // WAITING_DOCS
    await prisma.lot.create({ data: { ownerId: owner3.id, winnerId: inv2.id, address: 'Москва, ул. Воздвиженка, д. 6/2, кв. 7', area: 48.0, floor: 3, rooms: 2, hasDebts: false, hasMortgage: false, hasRegistered: false, expectedPrice: 8000000, status: 'WAITING_DOCS', auctionEndsAt: new Date(Date.now() + 2*60*60*1000), bids: { createMany: { data: [{ investorId: inv2.id, amount: 7200000 }] } } } });

    // DOCS_AUDIT
    await prisma.lot.create({ data: { ownerId: owner1.id, winnerId: inv1.id, address: 'Москва, ул. Арбат, д. 24, кв. 15', area: 68.5, floor: 5, rooms: 3, hasDebts: false, hasMortgage: false, hasRegistered: true, expectedPrice: 12500000, urgencyReason: 'Переезд за рубеж', status: 'DOCS_AUDIT', auctionEndsAt: new Date('2026-02-28T18:00:00Z'), bids: { createMany: { data: [{ investorId: inv1.id, amount: 11000000 }, { investorId: inv2.id, amount: 10500000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot1/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot1/passport.jpg' }, { type: 'OWNERSHIP_DOC', url: '/uploads/lot1/ownership.pdf' }, { type: 'PRIVATIZATION_REFUSAL', url: '/uploads/lot1/refusal.pdf' }] } } } });
    await prisma.lot.create({ data: { ownerId: owner2.id, winnerId: inv2.id, address: 'Москва, Кутузовский проспект, д. 36, кв. 88', area: 45.2, floor: 12, rooms: 2, hasDebts: false, hasMortgage: true, hasRegistered: false, expectedPrice: 8900000, urgencyReason: 'Развод, раздел имущества', status: 'DOCS_AUDIT', auctionEndsAt: new Date('2026-03-01T12:00:00Z'), bids: { createMany: { data: [{ investorId: inv2.id, amount: 8000000 }, { investorId: inv3.id, amount: 7800000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot2/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot2/passport.jpg' }, { type: 'MARRIAGE_CERT', url: '/uploads/lot2/marriage.pdf' }] } } } });

    // MANAGER_HANDOFF
    await prisma.lot.create({ data: { ownerId: owner3.id, winnerId: inv1.id, address: 'Москва, ул. Большая Дорогомиловская, д. 5, кв. 42', area: 78.0, floor: 3, rooms: 3, hasDebts: true, hasMortgage: false, hasRegistered: true, expectedPrice: 14200000, urgencyReason: 'Долги по ЖКХ', status: 'MANAGER_HANDOFF', investorDecision: 'approved', auctionEndsAt: new Date('2026-02-25T18:00:00Z'), bids: { createMany: { data: [{ investorId: inv1.id, amount: 13500000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot3/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot3/passport.jpg' }, { type: 'OWNERSHIP_DOC', url: '/uploads/lot3/ownership.pdf' }] } } } });
    await prisma.lot.create({ data: { ownerId: owner4.id, winnerId: inv3.id, address: 'Подмосковье, г. Химки, ул. Ленинградская, д. 12, кв. 7', area: 52.0, floor: 1, rooms: 2, hasDebts: false, hasMortgage: false, hasRegistered: false, expectedPrice: 6800000, urgencyReason: 'Наследство', status: 'MANAGER_HANDOFF', investorDecision: 'rejected', auctionEndsAt: new Date('2026-03-02T10:00:00Z'), bids: { createMany: { data: [{ investorId: inv3.id, amount: 6200000 }, { investorId: inv2.id, amount: 6050000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot4/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot4/passport.jpg' }] } } } });

    // SOLD
    await prisma.lot.create({ data: { ownerId: owner1.id, winnerId: inv2.id, address: 'Москва, ул. Тверская, д. 9, кв. 103', area: 91.3, floor: 7, rooms: 4, hasDebts: false, hasMortgage: false, hasRegistered: true, expectedPrice: 18000000, status: 'SOLD', auctionEndsAt: new Date('2026-02-15T18:00:00Z'), createdAt: new Date('2026-02-10T10:00:00Z'), bids: { createMany: { data: [{ investorId: inv2.id, amount: 16500000 }, { investorId: inv1.id, amount: 16200000 }, { investorId: inv3.id, amount: 15800000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot5/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot5/passport.jpg' }, { type: 'OWNERSHIP_DOC', url: '/uploads/lot5/ownership.pdf' }] } } } });
    await prisma.lot.create({ data: { ownerId: owner3.id, winnerId: inv1.id, address: 'Москва, Ленинский проспект, д. 56, кв. 22', area: 63.0, floor: 9, rooms: 3, hasDebts: false, hasMortgage: true, hasRegistered: false, expectedPrice: 11000000, urgencyReason: 'Ипотека', status: 'SOLD', auctionEndsAt: new Date('2026-01-20T18:00:00Z'), createdAt: new Date('2026-01-14T09:00:00Z'), bids: { createMany: { data: [{ investorId: inv1.id, amount: 9900000 }, { investorId: inv3.id, amount: 9700000 }] } }, media: { createMany: { data: [{ type: 'EGRN', url: '/uploads/lot6/egrn.pdf' }, { type: 'PASSPORT', url: '/uploads/lot6/passport.jpg' }] } } } });

    // CANCELED
    await prisma.lot.create({ data: { ownerId: owner2.id, address: 'Москва, ул. Профсоюзная, д. 110, кв. 5', area: 34.0, floor: 2, rooms: 1, hasDebts: true, hasMortgage: true, hasRegistered: true, expectedPrice: 5500000, urgencyReason: 'Проблемы с документами', status: 'CANCELED', auctionEndsAt: new Date('2026-02-05T18:00:00Z'), createdAt: new Date('2026-01-30T14:00:00Z'), bids: { createMany: { data: [{ investorId: inv2.id, amount: 5000000 }] } } } });

    const [lots, users, bids] = await Promise.all([prisma.lot.count(), prisma.user.count(), prisma.bid.count()]);
    console.log('\n✅ Seeding complete!');
    console.log(`  Lots: ${lots} (2 AUCTION, 1 WAITING_DOCS, 2 DOCS_AUDIT, 2 MANAGER_HANDOFF, 2 SOLD, 1 CANCELED)`);
    console.log(`  Users: ${users} (6 owners, 3 verified investors, 3 unverified investors)`);
    console.log(`  Bids: ${bids}, Settings: 6`);
}

main()
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
