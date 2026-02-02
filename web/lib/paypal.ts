const IS_LIVE = process.env.PAYPAL_MODE === 'live' || process.env.NODE_ENV === 'production';
const PAYPAL_API_URL = IS_LIVE
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
    ).toString('base64');

    console.log(`[PayPal] Attempting to get access token from ${PAYPAL_API_URL}...`);

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('[PayPal] Auth Error:', response.status, errorData);
        throw new Error(`PayPal Auth Failed: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.access_token;
}

export async function createPayPalOrder(storeId: string) {
    const accessToken = await getAccessToken();

    console.log(`[PayPal] Creating order for store: ${storeId}`);

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: storeId,
                    amount: {
                        currency_code: 'USD',
                        value: '15.00',
                    },
                    description: 'BeyBracket Pro Upgrade',
                },
            ],
            application_context: {
                brand_name: 'BeyBracket',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('[PayPal] Create Order Error:', response.status, errorData);
        throw new Error(`PayPal Create Order Failed: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log(`[PayPal] Order created: ${data.id}`);
    return data;
}

export async function capturePayPalOrder(orderId: string) {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('[PayPal] Capture Order Error:', response.status, errorData);
        throw new Error(`PayPal Capture Order Failed: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data;
}
