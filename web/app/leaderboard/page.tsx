import { getLeaderboard } from "@/lib/ranking";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Trophy, MapPin, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SeasonSelector } from "@/components/leaderboard/season-selector";
import { TIER_COLORS, TIER_ICONS } from "@/components/leaderboard/constants";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ scope?: string, location?: string, season?: string }> }) {
    const { scope = 'global', location = '', season = '' } = await searchParams;

    // Fetch All Seasons for Selector
    const { data: seasons } = await supabaseAdmin.from('seasons').select('id, name, is_active').order('start_date', { ascending: false });

    // Fetch Active Season Name for default display logic if needed
    const activeSeason = seasons?.find(s => s.is_active);
    const effectiveSeasonName = seasons?.find(s => s.id === season)?.name || activeSeason?.name || "Pre-Season";
    const isHistorical = season && season !== activeSeason?.id;

    // Fetch Leaderboard for specific season (or current if empty)
    const data = await getLeaderboard(scope as any, location, season && season !== 'current' ? season : undefined);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
            {/* Header */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-b border-white/5 py-12">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-block px-3 py-1 mb-4 rounded-full border border-yellow-500/30 bg-yellow-950/20 text-yellow-400 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_-3px_rgba(234,179,8,0.4)]">
                        {effectiveSeasonName}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 flex items-center justify-center gap-4">
                        <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                            Global Rankings
                        </span>
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        The world's top bladers, ranked by swiss points and tournament glory.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sticky top-[60px] z-30 bg-black/80 backdrop-blur-md border-b border-white/5 py-4">
                <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Left: Scope Filters */}
                    <div className="flex items-center gap-2">
                        <Link href={`/leaderboard?scope=global${season ? `&season=${season}` : ''}`}
                            className={cn("px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                                scope === 'global' ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white")}>
                            Global
                        </Link>
                        {/* Placeholder for local filters */}
                        <div className="relative group ml-2">
                            <span className="text-xs text-slate-600 uppercase font-black px-2">Local Filters Coming Soon</span>
                        </div>
                    </div>

                    {/* Right: Season Selector */}
                    <div className="flex items-center gap-4">
                        <SeasonSelector seasons={seasons || []} />
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="container mx-auto px-4 py-12">
                <AdUnit slot="leaderboard-top" className="mb-8" />
                <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 py-6 font-black uppercase tracking-widest text-xs text-slate-500 text-center w-16">Rank</th>
                                <th className="p-4 py-6 font-black uppercase tracking-widest text-xs text-slate-500">Blader</th>
                                <th className="p-4 py-6 font-black uppercase tracking-widest text-xs text-slate-500 text-center w-32 hidden md:table-cell">Tier</th>
                                <th className="p-4 py-6 font-black uppercase tracking-widest text-xs text-slate-500 text-right w-24">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data && data.length > 0 ? data.map((player: any, index: number) => {
                                const rank = index + 1;
                                const isTop3 = rank <= 3;
                                const TierIcon = TIER_ICONS[player.tier] || User;

                                return (
                                    <tr key={player.id} className="group border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-center">
                                            <div className={cn(
                                                "font-black text-xl italic",
                                                rank === 1 ? "text-yellow-400 text-3xl" :
                                                    rank === 2 ? "text-slate-300 text-2xl" :
                                                        rank === 3 ? "text-amber-600 text-2xl" : "text-slate-600"
                                            )}>
                                                {rank}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Link href={`/u/${player.username}`} className="flex items-center gap-4 group-hover:translate-x-2 transition-transform">
                                                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-cyan-500 transition-colors bg-slate-950">
                                                    {player.avatar_url ? (
                                                        <Image src={player.avatar_url} alt={player.username} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                            <User className="w-5 h-5 text-slate-700" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                                        {player.display_name || player.username}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        {player.city && player.country ? (
                                                            <>
                                                                <MapPin className="w-3 h-3" />
                                                                {player.city}, {player.country}
                                                            </>
                                                        ) : (
                                                            <span className="opacity-50">Unknown Location</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="p-4 text-center hidden md:table-cell">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider",
                                                TIER_COLORS[player.tier] || TIER_COLORS["Newbie"]
                                            )}>
                                                <TierIcon className="w-3 h-3" />
                                                {player.tier}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-black text-2xl text-white font-mono tracking-tighter">
                                                {player.ranking_points.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] uppercase text-slate-600 font-bold tracking-widest">
                                                PTS
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Trophy className="w-8 h-8 text-slate-700" />
                                        </div>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest">No ranked players yet.</p>
                                        <p className="text-slate-600 text-sm mt-2">Finish a match to earn points!</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
