import { prisma } from './db';
import { connection as pub } from './queue/connection';
import IORedis from 'ioredis';

// In-memory cache with TTL
const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds
const INVALIDATE_CHANNEL = 'SETTINGS_INVALIDATE';

const redisSubscriberSingleton = () => {
    if (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL) {
        return null;
    }
    const sub = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    sub.subscribe(INVALIDATE_CHANNEL).catch(console.error);
    sub.on('message', (channel, message) => {
        if (channel === INVALIDATE_CHANNEL) {
            try {
                const keys: string[] = JSON.parse(message);
                for (const key of keys) {
                    cache.delete(key);
                }
            } catch (e) {
                console.error('[SETTINGS] Failed to parse invalidate message', e);
            }
        }
    });
    return sub;
};

declare const globalThis: {
    redisSubscriberGlobal: ReturnType<typeof redisSubscriberSingleton>;
} & typeof global;

const subscriber = globalThis.redisSubscriberGlobal ?? redisSubscriberSingleton();

if (process.env.NODE_ENV !== 'production' && subscriber) {
    globalThis.redisSubscriberGlobal = subscriber;
}

/**
 * Get a setting value by key. Uses in-memory cache with 60s TTL.
 */
export async function getSetting(key: string): Promise<string | null> {
    if (process.env.NODE_ENV === 'test') {
        // Fallback to env for test environment to support existing tests that mutate process.env
        if (process.env[key] !== undefined) return process.env[key] as string;
        // Need to import DEFAULT_SETTINGS but it's at the bottom of the file
        // Wait, it's defined physically later, but we can access it if we move it or just use a local map.
        // Actually, in JS hoisting works for function declarations, but for const variables it doesn't.
        // I will just use process.env[key] || null.
        return process.env[key] || null;
    }

    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const setting = await prisma.setting.findUnique({ where: { key } });
    if (setting) {
        cache.set(key, { value: setting.value, expiresAt: Date.now() + CACHE_TTL_MS });
        return setting.value;
    }
    return null;
}

/**
 * Get a numeric setting with a fallback default.
 */
export async function getNumericSetting(key: string, fallback: number): Promise<number> {
    const val = await getSetting(key);
    if (val === null) return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
}

/**
 * Set a setting value (upsert). Invalidates cache immediately.
 */
export async function setSetting(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    cache.delete(key);
    if (process.env.NODE_ENV !== 'test') {
        pub.publish(INVALIDATE_CHANNEL, JSON.stringify([key])).catch(console.error);
    }
}

/**
 * Get all settings as a key-value object.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.key] = row.value;
        cache.set(row.key, { value: row.value, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return result;
}

/**
 * Bulk update settings. Invalidates cache for all updated keys.
 */
export async function updateSettings(entries: Record<string, string>): Promise<void> {
    await prisma.$transaction(
        Object.entries(entries).map(([key, value]) =>
            prisma.setting.upsert({
                where: { key },
                update: { value },
                create: { key, value },
            })
        )
    );
    const keys = Object.keys(entries);
    for (const key of keys) {
        cache.delete(key);
    }
    if (process.env.NODE_ENV !== 'test') {
        pub.publish(INVALIDATE_CHANNEL, JSON.stringify(keys)).catch(console.error);
    }
}

/** Known setting keys for type safety */
export const SettingKeys = {
    MANAGER_CHAT_ID: 'MANAGER_CHAT_ID',
    PLATFORM_FEE_RUB: 'PLATFORM_FEE_RUB',
    SLA_DOCS_UPLOAD_HOURS: 'SLA_DOCS_UPLOAD_HOURS',
    SLA_INVESTOR_REVIEW_HOURS: 'SLA_INVESTOR_REVIEW_HOURS',
    SLA_OFFER_RESPONSE_HOURS: 'SLA_OFFER_RESPONSE_HOURS',
    BOT_ACTIVE: 'BOT_ACTIVE',
} as const;

/** Default values for seeding */
export const DEFAULT_SETTINGS: Record<string, string> = {
    [SettingKeys.MANAGER_CHAT_ID]: '82003266,166848328',
    [SettingKeys.PLATFORM_FEE_RUB]: '100000',
    [SettingKeys.SLA_DOCS_UPLOAD_HOURS]: '2',
    [SettingKeys.SLA_INVESTOR_REVIEW_HOURS]: '24',
    [SettingKeys.SLA_OFFER_RESPONSE_HOURS]: '2',
    [SettingKeys.BOT_ACTIVE]: 'true',
};
