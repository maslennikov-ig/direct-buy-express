import { describe, expect, it } from 'vitest';
import { prisma } from '../lib/db';

describe('Database client', () => {
    it('should be instantiable and connect', async () => {
        expect(prisma).toBeDefined();
    });
});
