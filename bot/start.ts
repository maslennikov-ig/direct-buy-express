/**
 * Bot entrypoint — запускается отдельно от Next.js.
 * Используй: npx tsx bot/start.ts
 * или через docker-compose: command: ["npx", "tsx", "bot/start.ts"]
 */
import { bot } from "./index";
import { run } from "@grammyjs/runner";
import { logger } from "../lib/logger";
import { setupBot } from "./setup";

setupBot(bot).then(() => {
    logger.info('Bot commands registered in BotFather');
}).catch((err) => {
    logger.warn({ err }, 'Failed to register bot commands (non-fatal)');
});

const runner = run(bot);
logger.info('Bot started! Polling for updates...');

const stop = () => {
    logger.info('Received shutdown signal, stopping bot...');
    if (runner.isRunning()) runner.stop();
    process.exit(0);
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
