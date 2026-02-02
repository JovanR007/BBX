"use client";

import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayPalButtonProps {
    clientId: string;
}

function PayPalContent({ setError }: { setError: (err: string | null) => void }) {
    const router = useRouter();
    const [{ isPending }] = usePayPalScriptReducer();

    return (
        <div className="w-full space-y-4">
            {isPending && (
                <div className="w-full h-[150px] bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground text-sm font-medium border border-dashed">
                    Loading Secure Checkout...
                </div>
            )}
            <PayPalButtons
                style={{ layout: "vertical", label: "pay" }}
                createOrder={async () => {
                    setError(null);
                    const response = await fetch("/api/paypal/create-order", {
                        method: "POST",
                    });
                    const order = await response.json();
                    if (order.error) {
                        setError("Failed to initiate payment. Please try again.");
                        return "";
                    }
                    return order.id;
                }}
                onApprove={async (data) => {
                    try {
                        const response = await fetch("/api/paypal/capture-order", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ orderId: data.orderID }),
                        });
                        const result = await response.json();
                        if (result.success) {
                            router.push("/dashboard?upgrade=success");
                            router.refresh();
                        } else {
                            setError("Payment capture failed. Please contact support.");
                        }
                    } catch (err) {
                        setError("An error occurred during payment processing.");
                    }
                }}
                onError={(err) => {
                    console.error("PayPal Error:", err);
                    setError("A PayPal error occurred. Please try again.");
                }}
            />
        </div>
    );
}

export default function PayPalButton({ clientId: propClientId }: PayPalButtonProps) {
    const [error, setError] = useState<string | null>(null);

    // Standard Next.js way: Read client-side variables directly (fallback if prop is empty)
    const clientId = propClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

    // If no client ID, show a clear warning (helpful for staging config)
    if (!clientId) {
        return (
            <div className="bg-yellow-500/10 text-yellow-500 text-xs p-3 rounded-lg border border-yellow-500/20">
                <p className="font-bold mb-1">Payment Unavailable</p>
                <p>PayPal Client ID is missing (NEXT_PUBLIC_PAYPAL_CLIENT_ID).</p>
                <p className="mt-2 text-[10px] opacity-70 italic">Note: Make sure to click "Redeploy" in Vercel after adding variables.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Truncated debug info to help verify it's working (Safely shows first 5 chars) */}
            <div className="text-[10px] text-muted-foreground mb-2 text-right opacity-50">
                SDK Loaded: {clientId.substring(0, 5)}...
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 mb-4">
                    {error}
                </div>
            )}
            <PayPalScriptProvider options={{ clientId }}>
                <PayPalContent setError={setError} />
            </PayPalScriptProvider>
        </div>
    );
}
