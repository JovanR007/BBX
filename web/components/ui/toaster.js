"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ title, description, variant = "default", duration = 2500 }) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => {
            // Limit to max 3 toasts to prevent crowding
            const newToasts = [...prev, { id, title, description, variant, duration }];
            if (newToasts.length > 3) {
                return newToasts.slice(-3);
            }
            return newToasts;
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} {...toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ id, title, description, variant, duration, onRemove }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation frame
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onRemove, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onRemove]);

    const variants = {
        default: "bg-background border-border text-foreground",
        success: "bg-green-500/10 border-green-500/20 text-green-500",
        destructive: "bg-red-500/10 border-red-500/20 text-red-500",
    };

    const icons = {
        default: <Info className="w-5 h-5" />,
        success: <CheckCircle className="w-5 h-5" />,
        destructive: <AlertCircle className="w-5 h-5" />,
    };

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-start gap-4 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ease-out transform translate-y-4 opacity-0",
                variants[variant] || variants.default,
                isVisible && "translate-y-0 opacity-100"
            )}
        >
            <div className="shrink-0 pt-0.5">{icons[variant] || icons.default}</div>
            <div className="flex-1 space-y-1">
                {title && <h3 className="font-semibold text-sm leading-none">{title}</h3>}
                {description && <p className="text-sm opacity-90">{description}</p>}
            </div>
            <button onClick={() => setIsVisible(false)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
