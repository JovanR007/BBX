const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
    ).toString('base64');

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
}

export async function createPayPalOrder(storeId: string) {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/api+json',
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

    const data = await response.json();
    return data;
}

export async function capturePayPalOrder(orderId: string) {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/api+json',
        },
    });

    const data = await response.json();
    return data;
}
