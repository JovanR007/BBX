"use client";

import { X, CreditCard, Wallet, ExternalLink, QrCode, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface PaymentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    planPrice: string;
}

export function PaymentSelectorModal({
    isOpen,
    onClose,
    planPrice
}: PaymentSelectorModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [method, setMethod] = useState<'paypal' | 'gcash' | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = "unset";
            setMethod(null); // Reset selection on close
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
        )}>
            <div className={cn(
                "bg-card border border-border text-card-foreground shadow-2xl rounded-2xl w-full max-w-lg p-0 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-start border-b bg-muted/20">
                    <div>
                        <h3 className="text-xl font-bold leading-none tracking-tight mb-1">Upgrade to Pro</h3>
                        <p className="text-sm text-muted-foreground">Select your preferred payment method.</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted p-2 rounded-full">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {!method ? (
                        <div className="grid gap-4">
                            <button
                                onClick={() => setMethod('paypal')}
                                className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#003087]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <CreditCard className="w-6 h-6 text-[#003087]" />
                                </div>
                                <div>
                                    <span className="font-bold text-lg block group-hover:text-primary transition-colors">PayPal / Card</span>
                                    <span className="text-sm text-muted-foreground">Pay securely via PayPal.Me link.</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMethod('gcash')}
                                className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 hover:border-blue-500/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Wallet className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <span className="font-bold text-lg block group-hover:text-blue-500 transition-colors">GCash</span>
                                    <span className="text-sm text-muted-foreground">Scan QR code to pay instantly.</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Back Button */}
                            <button
                                onClick={() => setMethod(null)}
                                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
                            >
                                ← Back to options
                            </button>

                            {/* Content based on selection */}
                            <div className="text-center space-y-6">
                                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-muted mb-4">
                                    {method === 'paypal' ? <CreditCard className="w-8 h-8 text-[#003087]" /> : <QrCode className="w-8 h-8 text-blue-500" />}
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-2xl font-bold">
                                        Pay {planPrice} via {method === 'paypal' ? 'PayPal' : 'GCash'}
                                    </h4>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                        After sending payment, please take a screenshot and message us to activate your Pro account.
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                                </div>

                                {method === 'paypal' ? (
                                    <div className="bg-muted/30 p-6 rounded-xl border border-dashed">
                                        <p className="font-mono text-sm mb-4 select-all bg-card p-2 rounded border">paypal.me/beybracket</p>
                                        <a
                                            href="https://paypal.me/beybracket"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-[#003087] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#003087]/90 transition-transform hover:scale-105"
                                        >
                                            Paid via PayPal <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="bg-muted/30 p-6 rounded-xl border border-dashed flex flex-col items-center">
                                        {/* Placeholder QR */}
                                        <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-blue-500/10 flex flex-col items-center justify-center text-blue-500 text-xs font-bold text-center p-2">
                                                <QrCode className="w-12 h-12 mb-2 opacity-50" />
                                                YOUR GCASH QR HERE
                                            </div>
                                            {/* Use an actual image if provided later */}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">Scan with GCash App</p>
                                        <p className="font-bold text-lg">09XX-XXX-XXXX</p>
                                    </div>
                                )}

                                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg flex items-start gap-3 text-left">
                                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold mb-1">Processing Time</p>
                                        <p className="opacity-90">Usually activated within 1-2 hours after proof of payment is received.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
