import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN,
});

export async function getCached(key: string) {
    try {
        return await redis.get(key);
    } catch (err) {
        console.error("Upstash get error:", err);
        return null;
    }
}

export async function setCached(key: string, value: unknown, ttlSeconds?: number) {
    try {
        const payload = typeof value === "string" ? value : JSON.stringify(value);
        if (typeof ttlSeconds === "number") {
            // Upstash redis.set supports options { ex }
            await redis.set(key, payload, { ex: ttlSeconds });
        } else {
            await redis.set(key, payload);
        }
    } catch (err) {
        console.error("Upstash set error:", err);
    }
}

export default redis;

export async function delCached(key: string) {
    try {
        // @ts-ignore - upstash redis types include del
        await redis.del(key);
    } catch (err) {
        console.error("Upstash del error:", err);
    }
}
