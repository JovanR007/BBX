"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "primary", // primary | destructive
    isLoading = false
}) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = "hidden"; // Lock scroll
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for fade out
            document.body.style.overflow = "unset";
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
        )}>
            <div className={cn(
                "bg-card border border-border text-card-foreground shadow-2xl rounded-xl w-full max-w-md p-6 transform transition-all duration-300 scale-100",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold leading-none tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="mb-6">
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "px-4 py-2 text-sm font-bold rounded-md shadow-md transition-colors flex items-center gap-2 disabled:opacity-50",
                            variant === "destructive"
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        {isLoading && <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
