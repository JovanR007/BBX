
"use client";

import { Coffee, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportButtonProps {
    className?: string;
    variant?: "full" | "icon" | "mobile";
}

export function SupportButton({ className, variant = "full" }: SupportButtonProps) {
    const link = "https://ko-fi.com/godtis  "; // Placeholder

    if (variant === "mobile") {
        return (
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                    "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30",
                    className
                )}
            >
                <Coffee className="w-4 h-4 text-amber-500 group-hover:text-amber-400 transition-colors" />
                <span>Support the Dev</span>
            </a>
        );
    }

    if (variant === "icon") {
        return (
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all group",
                    "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/50",
                    className
                )}
                title="Support the Dev"
            >
                <Coffee className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
            </a>
        );
    }

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "group relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all overflow-hidden",
                "bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20",
                "border border-amber-500/30 hover:border-amber-500/60",
                "text-amber-500 hover:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                className
            )}
        >
            <Coffee className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10">Support Your Dev</span>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
        </a>
    );
}
