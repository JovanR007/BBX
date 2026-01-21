import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to add cache headers for completed tournament pages.
 * This allows CDN edge caching for tournaments that have finished.
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        // Match all paths except static files and api routes
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
