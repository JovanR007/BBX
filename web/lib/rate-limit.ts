/**
 * Simple in-memory rate limiter for API protection.
 * For production at scale, consider Redis-based solutions.
 */

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

// In-memory store (resets on server restart - use Redis for production)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
    // Max requests per window
    LIMIT: 100,
    // Window duration in seconds
    WINDOW_SECONDS: 60,
};

/**
 * Check if a request should be rate limited.
 * @param identifier - Usually the IP address or user ID
 * @returns RateLimitResult with remaining quota
 */
export function rateLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowMs = RATE_LIMIT_CONFIG.WINDOW_SECONDS * 1000;

    const record = ipRequestCounts.get(identifier);

    if (!record || now > record.resetTime) {
        // New window
        ipRequestCounts.set(identifier, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            success: true,
            limit: RATE_LIMIT_CONFIG.LIMIT,
            remaining: RATE_LIMIT_CONFIG.LIMIT - 1,
            reset: Math.ceil((now + windowMs) / 1000),
        };
    }

    if (record.count >= RATE_LIMIT_CONFIG.LIMIT) {
        // Rate limited
        return {
            success: false,
            limit: RATE_LIMIT_CONFIG.LIMIT,
            remaining: 0,
            reset: Math.ceil(record.resetTime / 1000),
        };
    }

    // Increment count
    record.count++;
    return {
        success: true,
        limit: RATE_LIMIT_CONFIG.LIMIT,
        remaining: RATE_LIMIT_CONFIG.LIMIT - record.count,
        reset: Math.ceil(record.resetTime / 1000),
    };
}

/**
 * Get rate limit headers for response.
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
    return {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
    };
}

/**
 * For edge/middleware usage - a simpler check.
 * Returns true if request should be blocked.
 */
export function isRateLimited(identifier: string): boolean {
    return !rateLimit(identifier).success;
}
