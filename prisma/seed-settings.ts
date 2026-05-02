import { prisma } from '../lib/db';
import { DEFAULT_SETTINGS } from '../lib/settings';

const settingsFromEnv = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [key, process.env[key] ?? fallback])
);

async function seed() {
    console.log('Seeding default settings...');
    
    for (const [key, value] of Object.entries(settingsFromEnv)) {
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
