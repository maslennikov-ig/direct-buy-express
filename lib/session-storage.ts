import { RedisAdapter } from "@grammyjs/storage-redis";
import { connection } from "./queue/connection";

export const sessionStorage = new RedisAdapter({
    instance: connection,
    ttl: 60 * 60 * 24 * 7, // 7 days
});
