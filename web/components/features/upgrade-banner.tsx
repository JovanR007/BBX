"use client";

import Link from "next/link";
import { Crown, ArrowRight } from "lucide-react";

interface UpgradeBannerProps {
    /** Current player count */
    playerCount: number;
    /** Max players allowed (16 for free) */
    maxPlayers: number;
    /** Whether to show the banner */
    show?: boolean;
}

/**
 * Banner shown when a free tier store is approaching or at player limit.
 */
export function UpgradeBanner({ playerCount, maxPlayers, show = true }: UpgradeBannerProps) {
    if (!show) return null;

    const isAtLimit = playerCount >= maxPlayers;
    const isNearLimit = playerCount >= maxPlayers - 4; // Within 4 of limit

    if (!isNearLimit && !isAtLimit) return null;

    return (
        <div className={`
            rounded-xl p-4 mb-6 flex items-center justify-between gap-4
            ${isAtLimit
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }
        `}>
            <div className="flex items-center gap-3">
                <div className={`
                    p-2 rounded-full
                    ${isAtLimit ? 'bg-red-500/20' : 'bg-yellow-500/20'}
                `}>
                    <Crown className={`w-5 h-5 ${isAtLimit ? 'text-red-500' : 'text-yellow-500'}`} />
                </div>
                <div>
                    <p className={`font-bold ${isAtLimit ? 'text-red-500' : 'text-yellow-500'}`}>
                        {isAtLimit
                            ? `Player limit reached (${playerCount}/${maxPlayers})`
                            : `Almost at player limit (${playerCount}/${maxPlayers})`
                        }
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Upgrade to Pro for unlimited players
                    </p>
                </div>
            </div>
            <Link
                href="/dashboard/billing"
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                    ${isAtLimit
                        ? 'bg-red-500 hover:bg-red-400 text-white'
                        : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    }
                `}
            >
                Upgrade <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

/**
 * Simple inline upgrade prompt for error messages.
 */
export function UpgradePrompt() {
    return (
        <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1 text-yellow-500 hover:text-yellow-400 font-bold underline underline-offset-2"
        >
            <Crown className="w-4 h-4" /> Upgrade to Pro
        </Link>
    );
}
