"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Store as StoreIcon, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Store } from "@/types";

interface StoreCardProps {
    store: Store;
    className?: string;
}

export function StoreCard({ store, className }: StoreCardProps) {
    const [imgError, setImgError] = useState(false);
    const isPro = store.plan === 'pro';

    // Custom colors for Pro stores
    const cardStyle = {
        "--card-primary": isPro && store.primary_color ? store.primary_color : "var(--primary)",
        "--card-secondary": isPro && store.secondary_color ? store.secondary_color : "var(--secondary)",
    } as React.CSSProperties;

    return (
        <Link
            href={`/s/${store.slug}`}
            style={cardStyle}
            className={cn(
                "group relative block bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden transition-all duration-500",
                "hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:-translate-y-2",
                isPro ? "hover:border-[var(--card-primary)]/50" : "hover:border-primary/50",
                className
            )}
        >
            {/* Pro Glow Effect */}
            {isPro && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -inset-[2px] bg-gradient-to-r from-[var(--card-primary)] to-[var(--card-secondary)] rounded-2xl blur-sm opacity-20" />
                </div>
            )}

            <div className="relative h-52 bg-slate-950 overflow-hidden">
                {store.image_url && !imgError ? (
                    <Image
                        src={store.image_url}
                        alt={store.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={() => setImgError(true)}
                        fill
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700 group-hover:text-[var(--card-primary)] transition-colors duration-500">
                        <StoreIcon className="w-16 h-16" />
                    </div>
                )}

                {/* Pro Badge */}
                {isPro && (
                    <div className="absolute top-4 right-4 z-20">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[var(--card-primary)]/50 text-[var(--card-primary)] text-[10px] font-black uppercase tracking-widest shadow-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--card-primary)] animate-pulse" />
                            Pro Store
                        </div>
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            </div>

            <div className="p-6 relative">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-black text-white group-hover:text-[var(--card-primary)] transition-colors duration-300 line-clamp-1 tracking-tight">
                        {store.name}
                    </h3>
                </div>

                <div className="space-y-2.5 text-sm text-slate-400">
                    {store.address && (
                        <div className="flex items-start">
                            <MapPin className="w-4 h-4 mr-2.5 mt-0.5 shrink-0 text-slate-600 group-hover:text-[var(--card-primary)] transition-colors" />
                            <span className="line-clamp-1 font-medium">{store.address}</span>
                        </div>
                    )}
                    {store.city && (
                        <div className="flex items-center">
                            <div className="w-4 h-4 mr-2.5 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-slate-700" />
                            </div>
                            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">{store.city}, {store.country}</span>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <div className={cn(
                        "flex items-center text-xs font-bold uppercase tracking-widest transition-all duration-300",
                        "text-slate-500 group-hover:text-[var(--card-primary)] group-hover:translate-x-1"
                    )}>
                        Enter Stadium <ArrowRight className="ml-2 w-3.5 h-3.5" />
                    </div>

                    {isPro && (
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-[var(--card-primary)] opacity-40" />
                            <div className="w-1 h-1 rounded-full bg-[var(--card-primary)] opacity-20" />
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
