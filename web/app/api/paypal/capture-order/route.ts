import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { capturePayPalOrder } from '@/lib/paypal';
import { TIERS } from '@/lib/lemonsqueezy'; // Reusing existing tier constants

export async function POST(request: NextRequest) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    try {
        const capture = await capturePayPalOrder(orderId);

        if (capture.status === 'COMPLETED') {
            // Get the store ID from the capture data (stored in reference_id during creation)
            const storeId = capture.purchase_units[0].reference_id;

            // Upgrade store to Pro
            const { error: updateError } = await supabaseAdmin
                .from('stores')
                .update({
                    plan: TIERS.PRO,
                    subscription_tier: TIERS.PRO,
                    paypal_order_id: orderId,
                })
                .eq('id', storeId);

            if (updateError) {
                console.error('Database update error:', updateError);
                return NextResponse.json({ error: 'Failed to upgrade store' }, { status: 500 });
            }

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Payment not completed', status: capture.status }, { status: 400 });
        }
    } catch (error) {
        console.error('PayPal Capture Order Error:', error);
        return NextResponse.json({ error: 'Failed to capture order' }, { status: 500 });
    }
}
