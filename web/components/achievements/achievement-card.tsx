"use client";

import { Trophy, Lock, Medal, Shield, Star, Flame, Crown, Gem, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export type AchievementTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'diamond';

interface AchievementProps {
    badge: {
        id: string;
        name: string;
        description: string;
        tier: string;
        icon_url?: string | null;
        requirement_text?: string | null;
        requirement_type?: string | null;
        target_value?: number | null;
    };
    progress: {
        current: number;
        target: number;
        isUnlocked: boolean;
        unlockedAt?: string | null;
    };
}

const TIER_STYLES: Record<string, string> = {
    common: "border-slate-800 bg-slate-900/40 text-slate-400 group-hover:border-slate-700",
    uncommon: "border-green-900/50 bg-green-950/20 text-green-400 group-hover:border-green-800 group-hover:shadow-[0_0_15px_-5px_theme(colors.green.900)]",
    rare: "border-cyan-900/50 bg-cyan-950/20 text-cyan-400 group-hover:border-cyan-800 group-hover:shadow-[0_0_15px_-5px_theme(colors.cyan.900)]",
    epic: "border-purple-900/50 bg-purple-950/20 text-purple-400 group-hover:border-purple-800 group-hover:shadow-[0_0_15px_-5px_theme(colors.purple.900)]",
    legendary: "border-orange-900/50 bg-orange-950/20 text-orange-400 group-hover:border-orange-600/50 group-hover:shadow-[0_0_20px_-5px_theme(colors.orange.600)] animate-pulse-slow",
    diamond: "border-white/20 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 text-white group-hover:border-white/40 group-hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)]"
};

const TIER_ICONS: Record<string, any> = {
    common: Medal,
    uncommon: Shield,
    rare: Star,
    epic: Flame,
    legendary: Crown,
    diamond: Gem
};

export function AchievementCard({ badge, progress }: AchievementProps) {
    const Icon = TIER_ICONS[badge.tier || 'common'] || Trophy;
    const isUnlocked = progress.isUnlocked;
    const percent = Math.min(100, Math.round((progress.current / (progress.target || 1)) * 100));

    // For loop: "1 more games to obtain"
    const remaining = (progress.target || 0) - progress.current;

    return (
        <div className={cn(
            "group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 overflow-hidden",
            isUnlocked ? TIER_STYLES[badge.tier || 'common'] : "border-slate-800/50 bg-slate-950/40 text-slate-600 opacity-80 hover:opacity-100 hover:border-slate-700"
        )}>
            {/* Background Glow for High Tier */}
            {(badge.tier === 'legendary' || badge.tier === 'diamond') && isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-current opacity-5 pointer-events-none" />
            )}

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={cn(
                    "p-3 rounded-xl border transition-all duration-300",
                    isUnlocked
                        ? "bg-black/40 border-current shadow-lg"
                        : "bg-slate-900 border-slate-800 grayscale"
                )}>
                    {isUnlocked ? <Icon className="w-8 h-8" /> : <Lock className="w-8 h-8 opacity-50" />}
                </div>

                {isUnlocked && (
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-current text-black px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </div>
                )}

                {!isUnlocked && badge.tier !== 'common' && (
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2 py-1 border border-current rounded-full">
                        {badge.tier}
                    </div>
                )}
            </div>

            <div className="flex-1 relative z-10">
                <h3 className={cn(
                    "font-black text-lg uppercase leading-tight mb-1 tracking-tight",
                    isUnlocked ? "text-slate-100" : "text-slate-500"
                )}>
                    {badge.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
                    {badge.description}
                </p>

                {/* Progress Section */}
                <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider opacity-70">
                        <span>{badge.requirement_text || "Secret Achievement"}</span>
                        <span>{isUnlocked ? "Done" : `${percent}%`}</span>
                    </div>

                    {!isUnlocked && (
                        <Progress value={percent} className="h-1.5 bg-slate-900" indicatorClassName={isUnlocked ? "bg-green-500" : "bg-slate-600"} />
                    )}

                    {!isUnlocked && remaining > 0 && remaining <= 5 && (
                        <div className="text-[10px] text-cyan-400 font-bold flex items-center justify-end gap-1 animate-pulse">
                            Only {remaining} {badge.requirement_type?.includes('match') ? 'match(es)' : 'game(s)'} left!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
