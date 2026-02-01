"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Trophy, Users, GitBranch, ArrowLeft, Loader2, Timer } from "lucide-react";
import { useTournament } from "@/hooks/use-tournament";
import { JudgeJoin } from "@/components/features/judge-join";
import { BrandedContainer } from "@/components/features/branded-container";

export function TournamentDashboardClient({ id }: { id: string }) {
    const { tournament, tournamentId, loading: tLoading, error, isOwner, isJudge } = useTournament(id);

    const [stats, setStats] = useState({ players: 0, matches: 0 });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (!tournamentId) return;

            const { count: playerCount } = await supabase
                .from("participants")
                .select("*", { count: "exact", head: true })
                .eq("tournament_id", tournamentId);

            const { count: matchCount } = await supabase
                .from("matches")
                .select("*", { count: "exact", head: true })
                .eq("tournament_id", tournamentId);

            setStats({ players: playerCount || 0, matches: matchCount || 0 });
            setLoadingStats(false);
        }
        fetchStats();
    }, [tournamentId]);

    if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;
    if (tLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    const tournamentName = tournament?.name || "Tournament";
    const loading = loadingStats;

    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="container mx-auto px-4 py-8 md:py-16"
        >
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> All Tournaments
                </Link>
            </div>

            <div className="flex flex-col items-center justify-center space-y-8 text-center">
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        {tournamentName}
                    </h1>
                    <p className="mx-auto max-w-[600px] text-muted-foreground text-lg">
                        Tournament Dashboard
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl mt-8">
                    {/* Card 1: Standings */}
                    <Link href={`/t/${tournamentId}/standings`} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg hover:border-primary/50">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex flex-col items-center space-y-4">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">View Standings</h3>
                            <p className="text-sm text-muted-foreground">Check current rankings and Swiss performance.</p>
                        </div>
                    </Link>

                    {/* Card 2: Bracket */}
                    <Link href={`/t/${tournamentId}/bracket`} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg hover:border-primary/50">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex flex-col items-center space-y-4">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <GitBranch className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Tournament Bracket</h3>
                            <p className="text-sm text-muted-foreground">Visualize the Elimination Stage.</p>
                        </div>
                    </Link>

                    {/* Card 3: Admin */}
                    {(isOwner || isJudge) && (
                        <Link href={`/t/${tournamentId}/admin`} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg hover:border-primary/50">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative flex flex-col items-center space-y-4">
                                <div className="p-3 bg-primary/10 rounded-full text-primary">
                                    <Trophy className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">Admin Console</h3>
                                <p className="text-sm text-muted-foreground">Report results and manage rounds.</p>
                            </div>
                        </Link>
                    )}

                    {/* Card 4: Match Timer */}
                    {isOwner && (
                        <Link href={`/t/${tournamentId}/timer`} target="_blank" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-md transition-all hover:shadow-lg hover:border-primary/50">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative flex flex-col items-center space-y-4">
                                <div className="p-3 bg-primary/10 rounded-full text-primary">
                                    <Timer className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">Match Timer</h3>
                                <p className="text-sm text-muted-foreground">3-minute clock + Go Shoot.</p>
                            </div>
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-bold">{loading ? "..." : stats.players}</span>
                        <span className="text-sm text-muted-foreground uppercase tracking-wider">Players</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-bold">{loading ? "..." : stats.matches}</span>
                        <span className="text-sm text-muted-foreground uppercase tracking-wider">Matches Played</span>
                    </div>
                </div>

                <JudgeJoin tournamentId={tournamentId || ""} />
            </div>
        </BrandedContainer>
    );
}
