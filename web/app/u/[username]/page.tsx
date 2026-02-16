import { supabaseAdmin } from "@/lib/supabase-admin";
import { User, Trophy, Calendar, Swords, Medal, Star, Shield, Flame, Crown, Gem } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { TournamentHistory } from "@/components/profile/tournament-history";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;

    // 1. Fetch Profile and Badges
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select(`
            *,
            user_badges (
                id,
                earned_at,
                badges (*)
            )
        `)
        .eq("username", username)
        .single();

    if (!profile) return notFound();

    // 2. Fetch Stats via Linked Participants
    // We need to find all participant entries linked to this user_id
    const { data: participations } = await supabaseAdmin
        .from("participants")
        .select(`
            id,
            display_name,
            tournament_id,
            tournaments (
                id,
                name,
                created_at,
                status,
                location,
                stores (name)
            )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false, foreignTable: "tournaments" });

    // 3. Aggregate Stats
    const totalTournaments = participations?.length || 0;

    // To get Win/Loss, we'd need to fetch matches for ALL these participant IDs.
    // This could be heavy. For MVP, we just list Tournaments.
    // Enhanced MVP: Fetch matches where participant_id IN (participations.ids)

    let totalWins = 0;
    let totalLosses = 0;
    let recentMatches = [];

    if (totalTournaments > 0) {
        // participations is inferred possibly null, but totalTournaments check covers it logically?
        // typescript doesn't know totalTournaments is derived from participations.length
        const safeParticipations = participations || [];
        const participantIds = safeParticipations.map((p: any) => p.id);
        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("*")
            .or(`participant_a_id.in.(${participantIds.join(',')}),participant_b_id.in.(${participantIds.join(',')})`)
            .eq("status", "complete")
            .order("updated_at", { ascending: false })
            .limit(50);

        if (matches) {
            matches.forEach((m: any) => {
                const isA = participantIds.includes(m.participant_a_id);
                // Check winner
                if (m.winner_id && participantIds.includes(m.winner_id)) {
                    totalWins++;
                } else if (m.winner_id) {
                    totalLosses++;
                }
            });
            recentMatches = matches.slice(0, 5); // Show last 5
        }
    }

    // 4. Prepare History Data
    // 4. Prepare History Data
    const historyData = (participations || []).reduce((acc: any[], p: any) => {
        const tournament = Array.isArray(p.tournaments) ? p.tournaments[0] : p.tournaments;
        if (!tournament) return acc;

        acc.push({
            id: tournament.id,
            name: tournament.name,
            created_at: tournament.created_at,
            status: tournament.status,
            location: tournament.location,
            store_name: tournament.stores?.name,
            played_as: p.display_name
        });
        return acc;
    }, []);

    const winRate = (totalWins + totalLosses) > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : 0;

    // 4. Categorize Badges
    const allEarned = profile.user_badges || [];
    const trophyCase = allEarned.filter((ub: any) =>
        ['legendary', 'diamond', 'epic'].includes(ub.badges?.tier?.toLowerCase())
    );
    const achievements = allEarned.filter((ub: any) =>
        !['legendary', 'diamond', 'epic'].includes(ub.badges?.tier?.toLowerCase())
    );

    const TIER_COLORS: Record<string, string> = {
        common: "text-slate-400 border-slate-800 bg-slate-900/50",
        uncommon: "text-green-400 border-green-900/30 bg-green-950/20",
        rare: "text-cyan-400 border-cyan-900/30 bg-cyan-950/20",
        epic: "text-purple-400 border-purple-900/30 bg-purple-950/20",
        legendary: "text-orange-400 border-orange-900/30 bg-orange-950/20 shadow-[0_0_15px_rgba(251,146,60,0.1)]",
        diamond: "text-white border-white/20 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    };

    const TIER_ICONS: Record<string, any> = {
        common: Medal,
        uncommon: Shield,
        rare: Star,
        epic: Flame,
        legendary: Crown,
        diamond: Gem
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Header */}
            <div className="bg-slate-900 border-b border-white/10 p-8 relative overflow-hidden">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full -ml-32 -mb-32" />

                <div className="container mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 p-1 shadow-2xl">
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={profile.username}
                                    className="object-cover w-full h-full"
                                    fill
                                />
                            ) : (
                                <User className="w-16 h-16 text-slate-700" />
                            )}
                        </div>
                    </div>
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase italic">
                            {profile.display_name}
                        </h1>
                        <p className="font-mono text-cyan-400 flex items-center gap-2 justify-center md:justify-start">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            @{profile.username}
                        </p>
                    </div>

                    {/* Key Stats Cards */}
                    <div className="flex flex-wrap justify-center gap-4 ml-auto">
                        <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">Win Rate</div>
                            <div className={`text-2xl font-black ${winRate >= 50 ? 'text-green-400' : 'text-slate-200'}`}>
                                {winRate}%
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">Matches</div>
                            <div className="text-2xl font-black text-white">
                                {totalWins + totalLosses}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">Events</div>
                            <div className="text-2xl font-black text-white">
                                {totalTournaments}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trophy Case (Call to Action / Highlight) */}
            {trophyCase.length > 0 && (
                <div className="bg-slate-950/50 border-b border-white/5 py-8">
                    <div className="container mx-auto px-4">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <Crown className="w-4 h-4 text-orange-400" />
                            Elite Trophy Case
                        </h2>
                        <div className="flex flex-wrap gap-6">
                            {trophyCase.map((ub: any) => {
                                const Icon = TIER_ICONS[ub.badges.tier] || Trophy;
                                return (
                                    <div key={ub.id} className={cn(
                                        "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-105 duration-300",
                                        TIER_COLORS[ub.badges.tier]
                                    )}>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:rotate-12 transition-transform">
                                            <Icon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black uppercase tracking-tight">{ub.badges.name}</div>
                                            <div className="text-[10px] opacity-60 uppercase font-bold tracking-widest">
                                                {ub.badges.tier}
                                            </div>
                                        </div>

                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 border border-white/10 rounded-lg text-xs w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                            {ub.badges.description}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto p-4 py-12 grid gap-12 lg:grid-cols-3">
                {/* Left: Tournament History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Dynamic Tournament History Component */}
                    <div className="bg-slate-950/30 rounded-2xl">
                        <TournamentHistory tournaments={historyData} />
                    </div>
                </div>

                {/* Right: Achievements & Matches */}
                <div className="space-y-12">
                    {/* Achievements Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-2">
                                <Star className="w-5 h-5 text-cyan-400" />
                                Achievements
                                <span className="text-[10px] text-slate-600 normal-case tracking-normal ml-2 font-mono">
                                    {achievements.length} UNLOCKED
                                </span>
                            </h2>
                            <Link href="/achievements" className="text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                                View All <Trophy className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {achievements.slice(0, 6).map((ub: any) => {
                                const Icon = TIER_ICONS[ub.badges.tier] || Medal;
                                return (
                                    <div key={ub.id} className={cn(
                                        "flex flex-col items-center text-center p-3 rounded-xl border transition-all hover:bg-slate-900 group relative",
                                        TIER_COLORS[ub.badges.tier]
                                    )}>
                                        <Icon className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                                        <div className="text-[10px] font-black uppercase leading-tight line-clamp-1">
                                            {ub.badges.name}
                                        </div>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 border border-white/10 rounded-lg text-xs w-40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            {ub.badges.description}
                                        </div>
                                    </div>
                                );
                            })}
                            {achievements.length === 0 && (
                                <div className="col-span-2 text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs uppercase font-black tracking-widest">
                                    No badges earned yet.
                                </div>
                            )}
                            {achievements.length > 6 && (
                                <Link href="/achievements" className="col-span-2 text-center py-2 text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest border border-slate-800 rounded-lg hover:bg-slate-800">
                                    + {achievements.length - 6} More
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                            <Swords className="w-5 h-5 text-red-500" /> Recent Battles
                        </h2>

                        <div className="space-y-3">
                            {recentMatches.map((m: any) => (
                                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between items-center mb-2 text-xs text-slate-500 font-mono">
                                        <span>{new Date(m.updated_at).toLocaleDateString()}</span>
                                        <span className="uppercase">Match {m.match_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className={m.winner_id && (participations || []).map((p: any) => p.id).includes(m.winner_id) ? "text-green-400 font-bold" : "text-white"}>
                                            {m.score_a}
                                        </span>
                                        <span className="text-slate-600 font-black italic">VS</span>
                                        <span className={m.winner_id && !(participations || []).map((p: any) => p.id).includes(m.winner_id) && m.winner_id ? "text-red-400" : "text-white"}>
                                            {m.score_b}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recentMatches.length === 0 && (
                                <div className="text-slate-500 text-sm">No recent matches found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
