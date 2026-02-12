"use client";

import { AchievementCard } from "./achievement-card";

interface AchievementsListProps {
    badges: any[];
    userBadges: any[];
    userStats: any; // e.g. { tournaments_joined: 5, matches_won: 12, ... }
}

export function AchievementsList({ badges, userBadges, userStats }: AchievementsListProps) {
    // 1. Sort badges: Unlocked first, then by Tier rarity
    const TIER_ORDER = ['diamond', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

    const processedBadges = badges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
        const isUnlocked = !!userBadge;

        // Calculate Progress
        let current = 0;
        let target = badge.target_value || 1;

        if (isUnlocked) {
            current = target;
        } else {
            // Check stats based on badge.requirement_type
            // Map the DB requirement_type to the keys in userStats
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedBadges.map(badge => (
                    <AchievementCard
                        key={badge.id}
                        badge={badge}
                        progress={badge.progress}
                    />
                ))}
            </div>
        </div>
    );
}
