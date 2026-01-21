import { supabaseAdmin } from "@/lib/supabase-admin";
import { User, Trophy, Calendar, Swords, Medal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;

    // 1. Fetch Profile
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
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
                status
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

    const winRate = (totalWins + totalLosses) > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Header */}
            <div className="bg-slate-900 border-b border-white/10 p-8">
                <div className="container mx-auto flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 p-1">
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" fill unoptimized />
                            ) : (
                                <User className="w-16 h-16 text-slate-700" />
                            )}
                        </div>
                    </div>
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            {profile.display_name}
                        </h1>
                        <p className="font-mono text-cyan-400">@{profile.username}</p>
                        {profile.bio && (
                            <p className="text-slate-400 max-w-lg">{profile.bio}</p>
                        )}
                    </div>

                    {/* Key Stats Cards */}
                    <div className="flex gap-4 ml-auto">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-xs uppercase text-slate-500 font-bold mb-1">Win Rate</div>
                            <div className={`text-2xl font-black ${winRate >= 50 ? 'text-green-400' : 'text-slate-200'}`}>
                                {winRate}%
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-xs uppercase text-slate-500 font-bold mb-1">Matches</div>
                            <div className="text-2xl font-black text-white">
                                {totalWins + totalLosses}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center min-w-[100px]">
                            <div className="text-xs uppercase text-slate-500 font-bold mb-1">Events</div>
                            <div className="text-2xl font-black text-white">
                                {totalTournaments}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 py-12 grid gap-12 lg:grid-cols-3">
                {/* Left: Tournament History */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" /> Tournament History
                    </h2>

                    <div className="grid gap-4">
                        {participations && participations.length > 0 ? participations.map((p: any) => {
                            const tournament = Array.isArray(p.tournaments) ? p.tournaments[0] : p.tournaments;
                            if (!tournament) return null;

                            return (
                                <Link href={`/t/${tournament.id}`} key={p.id} className="block group">
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
                                        <div>
                                            <div className="text-xs text-slate-500 font-mono mb-1 flex items-center gap-2">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(tournament.created_at).toLocaleDateString()}
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${tournament.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {tournament.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                                {tournament.name}
                                            </h3>
                                            <p className="text-sm text-slate-400">Played as: <span className="text-white">{p.display_name}</span></p>
                                        </div>
                                        <div className="text-right">
                                            {/* Rank could be calculated here if we fetch standings */}
                                            <Medal className="w-6 h-6 text-slate-700 group-hover:text-cyan-500 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        }) : (
                            <div className="text-slate-500 italic p-8 border border-dashed border-slate-800 rounded-xl text-center">
                                No tournament participation history yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Recent Matches */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
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
    );
}
