import { getLeaderboard } from "@/lib/ranking";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { User, Trophy, MapPin, Crown, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Helper for Tier Icons
const TIER_ICONS: any = {
    "Legend": Crown,
    "Master": Trophy,
    "Elite Blader": SwordsIcon,
    "Blader": Medal,
    "Trainee": ShieldIcon,
    "Newbie": User
};

const TIER_COLORS: any = {
    "Legend": "text-yellow-400 border-yellow-500/50 bg-yellow-950/30",
    "Master": "text-purple-400 border-purple-500/50 bg-purple-950/30",
    "Elite Blader": "text-red-400 border-red-500/50 bg-red-950/30",
    "Blader": "text-cyan-400 border-cyan-500/50 bg-cyan-950/30",
    "Trainee": "text-green-400 border-green-500/50 bg-green-950/30",
    "Newbie": "text-slate-400 border-slate-500/50 bg-slate-900/50"
};

function SwordsIcon({ className }: { className?: string }) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" /></svg> }
function ShieldIcon({ className }: { className?: string }) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> }

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ scope?: string, location?: string }> }) {
    const { scope = 'global', location = '' } = await searchParams;

    const data = await getLeaderboard(scope as any, location);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
            {/* Header */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-b border-white/5 py-12">
                <div className="container mx-auto px-4 text-center">
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
                <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/leaderboard?scope=global"
                        className={cn("px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                            scope === 'global' ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white")}>
                        Global
                    </Link>
                    {/* Add Country/City filters later via client component or simplified links for now */}
                    <div className="relative group">
                        <span className="text-xs text-slate-600 uppercase font-black px-2">Local Filters Coming in Phase 3.1</span>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="container mx-auto px-4 py-12">
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
