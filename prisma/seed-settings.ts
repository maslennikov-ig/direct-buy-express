import { prisma } from '../lib/db';
import { DEFAULT_SETTINGS } from '../lib/settings';

async function seed() {
    console.log('Seeding default settings...');
    
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await prisma.setting.upsert({
            where: { key },
            update: {}, // Don't overwrite existing values
            create: { key, value },
        });
        console.log(`  ${key} = ${value}`);
    }
    
    console.log('Done.');
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
