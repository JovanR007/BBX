
"use client";

import { AlertTriangle, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ConcludeModal({ isOpen, onClose, onConfirm, loading, isCasual = false }: { isOpen: boolean; onClose: () => void; onConfirm: (pin: string) => void; loading: boolean; isCasual?: boolean }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPin("");
            setError(false);
        }
    }, [isOpen]);

    function handleSubmit(e: any) {
        e.preventDefault();
        onConfirm(pin);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm rounded-xl border shadow-xl p-6 relative animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">Conclude Tournament?</h3>
                        <p className="text-sm text-muted-foreground">
                            This will mark the tournament as <strong className="text-foreground">Completed</strong> and move it to the archive. This action cannot be undone lightly.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        {/* Only show PIN field for ranked tournaments */}
                        {!isCasual && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Access</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="Enter Admin PIN"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full pl-9 h-10 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (!isCasual && !pin)}
                                className="flex-1 h-10 items-center justify-center rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Conclude
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
