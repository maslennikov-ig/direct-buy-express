import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadE2ETestEnv } from '@/scripts/e2e/env';

describe('E2E environment safety', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        for (const dir of tempDirs.splice(0)) {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    function makeTempProject() {
        const dir = mkdtempSync(path.join(tmpdir(), 'direct-buy-e2e-env-'));
        tempDirs.push(dir);
        return dir;
    }

    it('fails safely when .env.test is missing', () => {
        const cwd = makeTempProject();

        expect(() => loadE2ETestEnv({ cwd })).toThrow(/Missing \.env\.test/);
    });

    it('rejects a production-looking DATABASE_URL before tests can run', () => {
        const cwd = makeTempProject();
        writeFileSync(
            path.join(cwd, '.env.test'),
            'DATABASE_URL=postgresql://user:password@db.example.com:5432/directbuy\n',
        );

        expect(() => loadE2ETestEnv({ cwd })).toThrow(/isolated test database/);
    });

    it('rejects database names where the safety marker is only a substring', () => {
        const cwd = makeTempProject();
        writeFileSync(
            path.join(cwd, '.env.test'),
            'DATABASE_URL=postgresql://user:password@127.0.0.1:5432/contest\n',
        );

        expect(() => loadE2ETestEnv({ cwd })).toThrow(/isolated test database/);
    });

    it('uses DATABASE_URL from .env.test instead of an unsafe shell value', () => {
        const cwd = makeTempProject();
        writeFileSync(
            path.join(cwd, '.env.test'),
            'DATABASE_URL=postgresql://user:password@127.0.0.1:5432/directbuy_test\n',
        );

        const env = loadE2ETestEnv({
            cwd,
            processEnv: {
                DATABASE_URL: 'postgresql://user:password@db.example.com:5432/directbuy',
            },
        });

        expect(env.DATABASE_URL).toContain('/directbuy_test');
    });

    it('allows .env.test.local to override .env.test for local isolated services', () => {
        const cwd = makeTempProject();
        writeFileSync(
            path.join(cwd, '.env.test'),
            'DATABASE_URL=postgresql://user:password@127.0.0.1:5432/directbuy_test\n',
        );
        writeFileSync(
            path.join(cwd, '.env.test.local'),
            'DATABASE_URL=postgresql://user:password@127.0.0.1:55433/directbuy_e2e_test\n',
        );

        const env = loadE2ETestEnv({ cwd });

        expect(env.DATABASE_URL).toContain(':55433/directbuy_e2e_test');
    });
});
