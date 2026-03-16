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

let intentionalStop = false;
const runner = run(bot);
logger.info('Bot started! Polling for updates...');

// ── Auto-recovery: если runner остановился не по нашей команде — exit(1) для PM2 ──
const task = runner.task();
if (task) {
    task.then(() => {
        if (!intentionalStop) {
            logger.error('Runner stopped unexpectedly! Exiting for PM2 restart...');
            process.exit(1);
        }
    }).catch((err) => {
        logger.error({ err }, 'Runner crashed! Exiting for PM2 restart...');
        process.exit(1);
    });
}

// ── Health-check: периодическая проверка, что runner жив ──
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const healthCheck = setInterval(() => {
    if (!runner.isRunning() && !intentionalStop) {
        logger.error('Health check failed: runner is not running! Exiting for PM2 restart...');
        clearInterval(healthCheck);
        process.exit(1);
    }
}, HEALTH_CHECK_INTERVAL_MS);
healthCheck.unref(); // не блокируем event loop при graceful shutdown

const stop = () => {
    logger.info('Received shutdown signal, stopping bot...');
    intentionalStop = true;
    clearInterval(healthCheck);
    if (runner.isRunning()) runner.stop();
    process.exit(0);
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
