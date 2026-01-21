import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, parseWebhookEvent, TIERS } from '@/lib/lemonsqueezy';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    const signature = request.headers.get('x-signature') || '';
    const rawBody = await request.text();

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid LemonSqueezy webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = parseWebhookEvent(payload);

    if (!event) {
        console.error('Failed to parse webhook event');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log('LemonSqueezy webhook:', event.eventName, event.storeId);

    // Handle subscription events
    switch (event.eventName) {
        case 'subscription_created':
        case 'subscription_updated':
            if (event.status === 'active') {
                // Upgrade to Pro
                await supabaseAdmin
                    .from('stores')
                    .update({
                        subscription_tier: TIERS.PRO,
                        lemonsqueezy_customer_id: event.customerId,
                        lemonsqueezy_subscription_id: event.subscriptionId,
                    })
                    .eq('id', event.storeId);

                console.log(`Store ${event.storeId} upgraded to Pro`);
            }
            break;

        case 'subscription_cancelled':
        case 'subscription_expired':
            // Downgrade to Free
            await supabaseAdmin
                .from('stores')
                .update({
                    subscription_tier: TIERS.FREE,
                    lemonsqueezy_subscription_id: null,
                })
                .eq('id', event.storeId);

            console.log(`Store ${event.storeId} downgraded to Free`);
            break;

        default:
            console.log('Unhandled event:', event.eventName);
    }

    return NextResponse.json({ received: true });
}
