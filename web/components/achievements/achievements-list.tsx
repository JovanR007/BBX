"use client";

import { useState } from "react";
import { AchievementCard } from "./achievement-card";
import { Search, Filter, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementsListProps {
    badges: any[];
    userBadges: any[];
    userStats: any; // e.g. { tournaments_joined: 5, matches_won: 12, ... }
}

type FilterType = 'all' | 'unlocked' | 'locked';

export function AchievementsList({ badges, userBadges, userStats }: AchievementsListProps) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState("");

    // 1. Sort badges: Unlocked first, then by Tier rarity
    const TIER_ORDER = ['diamond', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

    // Process badges with progress data
    const processedBadges = badges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
        const isUnlocked = !!userBadge;

        // Calculate Progress
        let current = 0;
        let target = badge.target_value || 1;

        if (isUnlocked) {
            current = target;
        } else {
            const key = badge.requirement_type;
            if (key && userStats[key] !== undefined) {
                current = userStats[key];
            }
        }

        return {
            ...badge,
            progress: {
                current,
                target,
                isUnlocked,
                unlockedAt: userBadge?.earned_at
            }
        };
    }).sort((a, b) => {
        // 1. Unlocked first
        if (a.progress.isUnlocked && !b.progress.isUnlocked) return -1;
        if (!a.progress.isUnlocked && b.progress.isUnlocked) return 1;

        // 2. Sort by Tier (Diamond -> Common)
        const tierA = TIER_ORDER.indexOf(a.tier);
        const tierB = TIER_ORDER.indexOf(b.tier);
        return tierA - tierB;
    });

    // Apply Filter & Search
    const filteredBadges = processedBadges.filter(b => {
        // Filter by Status
        if (filter === 'unlocked' && !b.progress.isUnlocked) return false;
        if (filter === 'locked' && b.progress.isUnlocked) return false;

        // Filter by Search
        if (search) {
            const query = search.toLowerCase();
            return b.name.toLowerCase().includes(query) ||
                b.description.toLowerCase().includes(query) ||
                b.tier.toLowerCase().includes(query);
        }
        return true;
    });

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-white">{processedBadges.filter(b => b.progress.isUnlocked).length}</div>
                    <div className="text-xs text-slate-500 uppercase font-black tracking-widest">Unlocked</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-slate-400">{processedBadges.length}</div>
                    <div className="text-xs text-slate-500 uppercase font-black tracking-widest">Total Badges</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-cyan-400">
                        {Math.round((processedBadges.filter(b => b.progress.isUnlocked).length / processedBadges.length) * 100)}%
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-black tracking-widest">Completion</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-purple-400">
                        {processedBadges.filter(b => b.progress.isUnlocked && ['legendary', 'diamond'].includes(b.tier)).length}
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-black tracking-widest">Elite Earned</div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-30 bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search achievements..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                </div>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full p-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all", filter === 'all' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unlocked')}
                        className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1", filter === 'unlocked' ? "bg-green-900/30 text-green-400 shadow-sm border border-green-900/50" : "text-slate-500 hover:text-slate-300")}
                    >
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </button>
                    <button
                        onClick={() => setFilter('locked')}
                        className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1", filter === 'locked' ? "bg-slate-800 text-slate-300 shadow-sm" : "text-slate-500 hover:text-slate-300")}
                    >
                        <Lock className="w-3 h-3" /> Locked
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredBadges.map(badge => (
                    <AchievementCard
                        key={badge.id}
                        badge={badge}
                        progress={badge.progress}
                    />
                ))}

                {filteredBadges.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-600">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No details found</p>
                        <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
