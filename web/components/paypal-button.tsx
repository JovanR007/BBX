"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayPalButtonProps {
    clientId: string;
}

export default function PayPalButton({ clientId }: PayPalButtonProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    return (
        <PayPalScriptProvider options={{ clientId }}>
            <div className="w-full space-y-4">
                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}
                <PayPalButtons
                    style={{ layout: "vertical", label: "pay" }}
                    createOrder={async () => {
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
                                // Refresh the page to show Pro status or redirect to dashboard
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
        </PayPalScriptProvider>
    );
}
