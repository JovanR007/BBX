import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createPayPalOrder } from '@/lib/paypal';

export async function POST(request: NextRequest) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's store
    const { data: store } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single();

    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    try {
        const order = await createPayPalOrder(store.id);
        return NextResponse.json(order);
    } catch (error) {
        console.error('PayPal Create Order Error:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
