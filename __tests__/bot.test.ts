import { describe, expect, it, beforeEach } from 'vitest';
import { bot } from '../bot/index';

describe('Telegram Bot Foundation', () => {
    beforeEach(() => {
        process.env.BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    });

    it('should instantiate grammy bot', () => {
        expect(bot).toBeDefined();
        expect(bot.token).toBeDefined();
    });
});
