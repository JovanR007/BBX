/**
 * Cache configuration for tournament pages.
 * Use this in Server Components or API routes to set caching behavior.
 */

export const CACHE_CONFIG = {
    // Duration to cache completed tournament pages (24 hours)
    COMPLETED_TOURNAMENT: 86400,

    // Duration to cache active tournament pages (no cache - always fresh)
    ACTIVE_TOURNAMENT: 0,

    // Duration to cache static assets (1 year)
    STATIC_ASSETS: 31536000,

    // Duration to cache public pages like homepage (1 hour)
    PUBLIC_PAGES: 3600,
} as const;

/**
 * Helper to get cache headers for a tournament based on its status.
 */
export function getTournamentCacheHeaders(status: string): HeadersInit {
    if (status === 'completed') {
        return {
            'Cache-Control': `public, s-maxage=${CACHE_CONFIG.COMPLETED_TOURNAMENT}, stale-while-revalidate=86400`,
        };
    }
    // For active tournaments, don't cache
    return {
        'Cache-Control': 'no-store, must-revalidate',
    };
}

/**
 * Use this in Server Components for revalidation timing.
 * Returns 0 for active tournaments (always revalidate) or a longer time for completed.
 */
export function getTournamentRevalidate(status: string): number | false {
    if (status === 'completed') {
        return CACHE_CONFIG.COMPLETED_TOURNAMENT;
    }
    return 0; // Always revalidate for active tournaments
}
