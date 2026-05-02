import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

const DEFAULT_ENV_FILE = '.env.test';
const SAFE_DATABASE_NAME_PATTERN = /(?:^|[_-])(test|e2e|ci)(?:$|[_-])|(?:test|e2e|ci)/i;
const UNSAFE_DATABASE_NAMES = new Set([
    'directbuy',
    'postgres',
    'production',
    'prod',
    'template0',
    'template1',
]);

type LoadE2ETestEnvOptions = {
    cwd?: string;
    envFile?: string;
    processEnv?: NodeJS.ProcessEnv;
};

export function loadE2ETestEnv(options: LoadE2ETestEnvOptions = {}): NodeJS.ProcessEnv {
    const cwd = options.cwd ?? process.cwd();
    const envFile = options.envFile ?? DEFAULT_ENV_FILE;
    const envPath = path.resolve(cwd, envFile);
    const localEnvPath = path.resolve(cwd, `${envFile}.local`);

    if (!existsSync(envPath)) {
        throw new Error(
            `[e2e safety] Missing ${envFile}. Refusing to run destructive E2E tests without an isolated test database.`,
        );
    }

    const fileEnv = {
        ...parse(readFileSync(envPath)),
        ...(existsSync(localEnvPath) ? parse(readFileSync(localEnvPath)) : {}),
    };
    const databaseUrl = fileEnv.DATABASE_URL?.trim();
    assertIsolatedE2EDatabaseUrl(databaseUrl);

    const env: NodeJS.ProcessEnv = {
        ...options.processEnv,
        ...fileEnv,
        NODE_ENV: 'test',
    };

    return env;
}

export function assertIsolatedE2EDatabaseUrl(databaseUrl: string | undefined) {
    if (!databaseUrl) {
        throw new Error(
            '[e2e safety] DATABASE_URL is missing from .env.test. Refusing to run destructive E2E tests.',
        );
    }

    let parsed: URL;
    try {
        parsed = new URL(databaseUrl);
    } catch {
        throw new Error(
            '[e2e safety] DATABASE_URL in .env.test is invalid. Refusing to run destructive E2E tests.',
        );
    }

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
        throw new Error(
            '[e2e safety] DATABASE_URL must use PostgreSQL for the isolated test database.',
        );
    }

    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
    if (!databaseName) {
        throw new Error(
            '[e2e safety] DATABASE_URL must include an isolated test database name.',
        );
    }

    if (UNSAFE_DATABASE_NAMES.has(databaseName.toLowerCase()) || !SAFE_DATABASE_NAME_PATTERN.test(databaseName)) {
        throw new Error(
            '[e2e safety] DATABASE_URL must point to an explicitly isolated test database before destructive E2E setup can run.',
        );
    }
}
