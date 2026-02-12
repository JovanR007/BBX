"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
    Trophy, Users, GitBranch, ArrowLeft, Loader2, Timer,
    Calendar, MapPin, Activity, CheckCircle2, ChevronRight,
    Star, LayoutDashboard, ExternalLink
} from "lucide-react";
import { useTournament } from "@/hooks/use-tournament";
import { JudgeJoin } from "@/components/features/judge-join";
import { PlayerJoin } from "@/components/features/player-join";
import { BrandedContainer } from "@/components/features/branded-container";
import { AdUnit } from "@/components/AdUnit";
import { useUser } from "@stackframe/stack";
import { getTournamentDataAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function TournamentDashboardClient({ id }: { id: string }) {
    const { tournament: baseTournament, tournamentId, loading: tLoading, error, isOwner, isJudge } = useTournament(id);
    const user = useUser();

    const [isParticipant, setIsParticipant] = useState(false);
    const [fullData, setFullData] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!tournamentId) return;
            setLoadingData(true);

            const res = await getTournamentDataAction(tournamentId);
            if (res.success) {
                setFullData(res);

                // Check participation
                if (user) {
                    const isPart = res.participants?.some((p: any) => p.user_id === user.id);
                    setIsParticipant(!!isPart);
                }
            }
            setLoadingData(false);
        }
        fetchData();
    }, [tournamentId, user]);

    if (error) return <div className="text-center py-20 text-red-500 font-bold bg-destructive/10 rounded-xl m-4 border border-destructive/20">Error: {error}</div>;
    if (tLoading || (loadingData && !fullData)) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading Tournament Data...</p>
        </div>
    );

    const tournament = fullData?.tournament || baseTournament;
    const participants = fullData?.participants || [];
    const matches = fullData?.matches || [];
    const tournamentName = tournament?.name || "Tournament";

    const stats = {
        players: participants.length,
        matches: matches.length,
        checkedIn: participants.filter((p: any) => p.checked_in).length,
        inProgress: matches.filter((m: any) => m.status === 'in_progress' || (m.status === 'pending' && tournament.status === 'started')).length
    };

    const isLive = tournament?.status === "started";
    const currentRound = matches.length > 0 ? Math.max(...matches.map((m: any) => m.swiss_round_number || 0)) : 1;

    // Get Top Standings (Simplified for Dashboard Preview)
    const topPerformers = participants
        .filter((p: any) => !p.dropped)
        .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
        .slice(0, 5);

    // Get Recent Matches
    const recentMatches = matches
        .filter((m: any) => m.status === 'complete')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="container mx-auto px-4 py-6 md:py-12 max-w-7xl overflow-x-hidden"
        >
            {/* Breadcrumb / Back Navigation */}
            <div className="mb-6 md:mb-10">
                <Link href="/tournaments" className="group inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    All Tournaments
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-8 md:space-y-12">

                    {/* Premium Hero Section */}
                    <div className="relative overflow-hidden rounded-3xl border bg-card/40 backdrop-blur-md p-8 md:p-12 shadow-2xl border-white/5 group">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border transition-colors",
                                        isLive
                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                        {tournament.status}
                                    </span>
                                    {isLive && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                            ROUND {currentRound}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                                    {tournamentName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground font-medium">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary/70" /> {tournament.location || "Online"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary/70" /> {format(new Date(tournament.start_time), 'MMM do, yyyy')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 md:mt-12 pt-8 border-t border-white/5">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Participants</div>
                                <div className="text-2xl font-black text-foreground flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> {stats.players}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Match Count</div>
                                <div className="text-2xl font-black text-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" /> {stats.matches}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Checked In</div>
                                <div className="text-2xl font-black text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" /> {stats.checkedIn}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active</div>
                                <div className="text-2xl font-black text-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" /> {stats.inProgress}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <DashboardNavCard
                            href={`/t/${tournamentId}/standings`}
                            icon={Trophy}
                            title="Rankings"
                            description="Real-time Swiss standings and player performance."
                            color="blue"
                        />
                        <DashboardNavCard
                            href={`/t/${tournamentId}/bracket`}
                            icon={GitBranch}
                            title="Bracket"
                            description="Visualize the elimination phase and path to victory."
                            color="purple"
                        />
                        {(isOwner || isJudge) && (
                            <DashboardNavCard
                                href={`/t/${tournamentId}/admin`}
                                icon={LayoutDashboard}
                                title="Admin Suite"
                                description="Manage rounds, report match results, and configure settings."
                                color="orange"
                            />
                        )}
                        {isOwner && (
                            <DashboardNavCard
                                href={`/t/${tournamentId}/timer`}
                                icon={Timer}
                                title="Tournament Clock"
                                description="Standard 3-minute match timer for localized events."
                                color="yellow"
                                external
                            />
                        )}
                    </div>

                    {/* Ad Unit Integrated */}
                    <div className="rounded-2xl overflow-hidden border bg-muted/20">
                        <AdUnit slot="tournament-dashboard" format="horizontal" className="w-full min-h-[100px] max-h-[250px]" />
                    </div>

                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">

                    {/* Participation Status Card */}
                    <div className="bg-card/50 backdrop-blur-sm border rounded-3xl p-6 shadow-xl border-white/5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Tournament Access</h3>

                        {!tLoading && !isOwner && !isJudge && (
                            <div className="space-y-6">
                                <PlayerJoin tournamentId={tournamentId || ""} isRegistered={isParticipant} />
                            </div>
                        )}

                        <div className="mt-4">
                            <JudgeJoin tournamentId={tournamentId || ""} />
                        </div>

                        {isOwner && (
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-2 mt-4">
                                <p className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                                    <Star className="w-3 h-3 fill-current" /> Organizer Access
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    You have full control over this tournament. Management tools are available in the Admin Suite.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Standings Preview */}
                    <div className="bg-card/50 backdrop-blur-sm border rounded-3xl overflow-hidden shadow-xl border-white/5">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Top Contenders</h3>
                            <Trophy className="w-4 h-4 text-yellow-500/50" />
                        </div>
                        <div className="p-2">
                            {topPerformers.length > 0 ? (
                                topPerformers.map((player: any, idx: number) => (
                                    <div key={player.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                                                idx === 0 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                                    idx === 1 ? "bg-slate-300/10 border-slate-300/20 text-slate-300" :
                                                        idx === 2 ? "bg-orange-400/10 border-orange-400/20 text-orange-400" :
                                                            "bg-muted border-transparent text-muted-foreground"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-bold truncate max-w-[120px]">{player.display_name}</span>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-primary">{player.points || 0} PTS</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-xs text-muted-foreground italic">No matches scored yet.</div>
                            )}
                        </div>
                        <Link href={`/t/${tournamentId}/standings`} className="block p-4 text-center text-[10px] font-bold text-primary hover:bg-primary/10 border-t border-white/5 transition-colors uppercase tracking-widest">
                            View Full Standings
                        </Link>
                    </div>

                    {/* Recent Matches */}
                    <div className="bg-card/50 backdrop-blur-sm border rounded-3xl overflow-hidden shadow-xl border-white/5">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Feed</h3>
                            <Activity className="w-4 h-4 text-blue-500/50" />
                        </div>
                        <div className="p-4 space-y-4">
                            {recentMatches.length > 0 ? (
                                recentMatches.map((match: any) => (
                                    <div key={match.id} className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            <span>Round {match.swiss_round_number}</span>
                                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> Done</span>
                                        </div>
                                        <div className="grid grid-cols-5 items-center gap-2 p-3 bg-muted/20 rounded-2xl border border-white/5">
                                            <div className="col-span-2 truncate text-xs font-bold text-center">
                                                {participants.find((p: any) => p.id === match.participant_a_id)?.display_name || "BYE"}
                                            </div>
                                            <div className="col-span-1 text-[10px] font-black text-center text-primary">{match.score_a} - {match.score_b}</div>
                                            <div className="col-span-2 truncate text-xs font-bold text-center">
                                                {participants.find((p: any) => p.id === match.participant_b_id)?.display_name || "BYE"}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-[10px] text-muted-foreground italic">Feed waiting for results...</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </BrandedContainer>
    );
}

function DashboardNavCard({ href, icon: Icon, title, description, color, external = false }: { href: string, icon: any, title: string, description: string, color: string, external?: boolean }) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
        orange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
        yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
    };

    const LinkComponent: any = external ? "a" : Link;
    const additionalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

    return (
        <LinkComponent
            href={href}
            {...additionalProps}
            className="group relative overflow-hidden rounded-3xl border bg-card/40 backdrop-blur-md p-6 shadow-lg transition-all hover:shadow-primary/5 hover:border-primary/50 active:scale-[0.98]"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-start gap-4">
                <div className={cn("p-4 rounded-2xl shrink-0 transition-transform group-hover:rotate-6", colorMap[color])}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1 pr-4">
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                        {title}
                        {external && <ExternalLink className="w-3 h-3 opacity-50" />}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        {description}
                    </p>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                    <ChevronRight className="w-5 h-5 text-primary" />
                </div>
            </div>
        </LinkComponent>
    );
}
