import crypto from 'crypto';

/**
 * LemonSqueezy API client for BeyBracket monetization.
 * Docs: https://docs.lemonsqueezy.com/api
 */

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

interface LemonSqueezyConfig {
    apiKey: string;
    storeId: string;
    variantId: string; // Pro subscription variant
}

function getConfig(): LemonSqueezyConfig {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
        throw new Error('LemonSqueezy environment variables not configured');
    }

    return { apiKey, storeId, variantId };
}

/**
 * Create a checkout URL for a customer to upgrade to Pro.
 */
export async function createCheckoutUrl(
    storeOwnerId: string,
    email: string,
    storeId: string
): Promise<string | null> {
    const config = getConfig();

    const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        email,
                        custom: {
                            store_id: storeId, // Your BeyBracket store ID for webhook
                            user_id: storeOwnerId,
                        },
                    },
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: config.storeId,
                        },
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: config.variantId,
                        },
                    },
                },
            },
        }),
    });

    if (!response.ok) {
        console.error('LemonSqueezy checkout error:', await response.text());
        return null;
    }

    const data = await response.json();
    return data.data?.attributes?.url || null;
}

/**
 * Verify webhook signature from LemonSqueezy.
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string
): boolean {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) return false;

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

/**
 * Parse subscription event from webhook payload.
 */
export interface SubscriptionEvent {
    eventName: string;
    storeId: string; // BeyBracket store ID from custom data
    customerId: string; // LemonSqueezy customer ID
    subscriptionId: string;
    status: 'active' | 'cancelled' | 'expired' | 'past_due';
}

export function parseWebhookEvent(payload: any): SubscriptionEvent | null {
    try {
        const eventName = payload.meta?.event_name;
        const attributes = payload.data?.attributes;
        const customData = payload.meta?.custom_data;

        if (!eventName || !attributes || !customData?.store_id) {
            return null;
        }

        return {
            eventName,
            storeId: customData.store_id,
            customerId: String(attributes.customer_id),
            subscriptionId: String(payload.data.id),
            status: attributes.status,
        };
    } catch {
        return null;
    }
}

/**
 * Subscription tier constants.
 */
export const TIERS = {
    FREE: 'free',
    PRO: 'pro',
} as const;

export const TIER_LIMITS = {
    [TIERS.FREE]: {
        maxPlayers: 16,
    },
    [TIERS.PRO]: {
        maxPlayers: Infinity,
    },
} as const;

export type SubscriptionTier = typeof TIERS[keyof typeof TIERS];
