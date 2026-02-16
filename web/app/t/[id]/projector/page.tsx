"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useBracketData } from "@/hooks/use-bracket-data";
import { BracketConnector } from "@/components/features/bracket-connector";
import { SingleEliminationBracket, Match as CustomMatch } from "react-tournament-brackets";
import { ProjectorMatchCard } from "@/components/features/projector-match-card";
import { LiveStandings } from "@/components/features/live-standings";
import { Match, Participant } from "@/types";
import { QRCodeDisplay } from "@/components/features/qr-code";
import { Loader2, Crown, Trophy, Maximize2, Minimize2, LogOut, Medal, Sparkles } from "lucide-react";
import { BrandedContainer } from "@/components/features/branded-container";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const LiveCameraFeed = dynamic(() => import("@/components/features/live-camera-feed").then(mod => mod.LiveCameraFeed), { ssr: false });

// Re-use theme from BracketPage
const BeybladeTheme = {
    textColor: { main: '#E2E8F0', highlighted: '#F8FAFC', dark: '#94A3B8', disabled: '#475569' },
    matchBackground: { wonColor: '#1e293b', lostColor: '#0f172a' },
    score: {
        background: { wonColor: '#1e293b', lostColor: '#0f172a' },
        text: { highlightedWonColor: '#22c55e', highlightedLostColor: '#ef4444' }
    },
    border: {
        color: '#334155',
        highlightedColor: '#22D3EE',
    },
    roundHeader: { backgroundColor: 'transparent', fontColor: '#94A3B8' },
    connectorColor: '#334155',
    connectorColorHighlight: '#22D3EE',
    svgBackground: 'transparent',
    fontFamily: '"Inter", sans-serif',
    transitionTimingFunction: 'ease-in-out',
    disabledColor: '#475569',
    roundHeaders: { background: 'transparent' },
    canvasBackground: 'transparent'
};

// Custom Match Component for the Tree Bracket
const ProjectorBracketMatch = ({ match }: { match: any }) => {
    const topParty = match.participants?.[0];
    const bottomParty = match.participants?.[1];
    if (!topParty || !bottomParty) return null;

    const isTBD = (topParty.name === 'TBD' || topParty.name === 'BYE') &&
        (bottomParty.name === 'TBD' || bottomParty.name === 'BYE');

    return (
        <div className={cn(
            "flex flex-col border rounded-xl overflow-hidden shadow-2xl transition-all duration-300",
            isTBD ? "border-slate-800 opacity-40 bg-slate-900/40" : "border-slate-700 bg-slate-900/90"
        )}>
            {/* Top Player */}
            <div className={cn(
                "flex justify-between items-center px-4 py-3 border-b border-slate-800 transition-colors h-[70px]",
                topParty.isWinner ? "bg-cyan-500/10" : ""
            )}>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                        "text-lg font-black uppercase tracking-tight truncate",
                        topParty.isWinner ? "text-cyan-400" : "text-slate-100"
                    )}>
                        {topParty.name}
                    </span>
                </div>
                <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-lg font-black font-mono text-2xl ml-3 shrink-0",
                    topParty.isWinner ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                )}>
                    {topParty.resultText || "0"}
                </div>
            </div>

            {/* Bottom Player */}
            <div className={cn(
                "flex justify-between items-center px-4 py-4 transition-colors h-[70px]",
                bottomParty.isWinner ? "bg-cyan-500/10" : ""
            )}>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                        "text-lg font-black uppercase tracking-tight truncate",
                        bottomParty.isWinner ? "text-cyan-400" : "text-slate-100"
                    )}>
                        {bottomParty.name}
                    </span>
                </div>
                <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-lg font-black font-mono text-2xl ml-3 shrink-0",
                    bottomParty.isWinner ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                )}>
                    {bottomParty.resultText || "0"}
                </div>
            </div>
        </div>
    );
};

const Controls = ({ isFullscreen, toggleFullscreen, tournamentId }: { isFullscreen: boolean; toggleFullscreen: () => void; tournamentId: string }) => (
    <div className="flex gap-2">
        <button
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </button>
        <Link
            href={`/t/${tournamentId}`}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-500 transition-all backdrop-blur-sm border border-red-500/20"
            title="Exit Projector Mode"
        >
            <LogOut className="w-6 h-6" />
        </Link>
    </div>
);

export default function ProjectorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);
    const {
        loading,
        tournament,
        matches,
        participants,
        viewMode,
        derived: {
            swissMatches = [],
            topCutMatches = [],
            winner,
            runnerUp,
            thirdPlace,
            isTournamentComplete
        } = {}
    } = useBracketData(tournamentId);

    const [origin, setOrigin] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [topCutViewMode, setTopCutViewMode] = useState<'grid' | 'bracket'>('grid');

    // Auto-Cycle Top Cut View every 20 seconds
    useEffect(() => {
        if (viewMode !== 'top_cut') return;
        const timer = setInterval(() => {
            setTopCutViewMode(prev => prev === 'grid' ? 'bracket' : 'grid');
        }, 20000);
        return () => clearInterval(timer);
    }, [viewMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOrigin(window.location.origin);
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Calculate total expected rounds based on cutSize (Moved up for usage in activeRoundName)
    const totalRounds = useMemo(() => {
        const size = tournament?.cut_size || 4;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(size)));
        return Math.log2(bracketSize);
    }, [tournament?.cut_size]);

    // 0. Calculate Universal Pagination Details
    const MATCHES_PER_PAGE = 24;

    // Find Target Matches (Either for Swiss or Top Cut Grid)
    const activeGridMatches = useMemo(() => {
        if (viewMode === 'swiss') {
            const maxRound = Math.max(0, ...swissMatches.map(m => m.swiss_round_number));
            return swissMatches.filter(m => m.swiss_round_number === maxRound && m.status !== 'complete');
        } else {
            // Find earliest incomplete round
            const incompleteRounds = [...new Set(topCutMatches.filter(m => m.status !== 'complete').map(m => m.bracket_round))];
            if (incompleteRounds.length === 0) return [];
            const targetRound = Math.min(...incompleteRounds);
            return topCutMatches.filter(m => m.bracket_round === targetRound && !m.is_bye);
        }
    }, [viewMode, swissMatches, topCutMatches]);

    const totalPages = Math.ceil(activeGridMatches.length / MATCHES_PER_PAGE);

    // Round Name for Header
    const activeRoundName = useMemo(() => {
        if (viewMode === 'swiss') {
            const maxRound = Math.max(0, ...activeGridMatches.map(m => m.swiss_round_number));
            return `Swiss Round ${maxRound}`;
        } else {
            const currentRound = activeGridMatches[0]?.bracket_round;
            if (!currentRound) return "";
            if (currentRound === totalRounds) return "Grand Finals";
            if (currentRound === totalRounds - 1) return "Semifinals";
            if (currentRound === totalRounds - 2) return "Quarterfinals";
            return `Elimination Round ${currentRound}`;
        }
    }, [viewMode, activeGridMatches, totalRounds]);

    // Safe Page Calculation (Derived State)
    const safeCurrentPage = (totalPages > 0 && currentPage >= totalPages) ? 0 : currentPage;

    // Auto-Cycle Pages Every 15 Seconds
    useEffect(() => {
        if (totalPages <= 1) return;

        const timer = setInterval(() => {
            setCurrentPage(prev => {
                const next = prev + 1;
                return next >= totalPages ? 0 : next;
            });
        }, 15000);

        return () => clearInterval(timer);
    }, [totalPages]);



    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // ... (swissKing logic unchanged)
    const swissKing = useMemo(() => {
        if (!swissMatches || swissMatches.length === 0 || !participants) return null;
        const scores: Record<string, { wins: number }> = {};
        Object.keys(participants).forEach(pid => scores[pid] = { wins: 0 });
        swissMatches.forEach(m => {
            if (m.status !== 'complete' || !m.winner_id) return;
            if (scores[m.winner_id]) scores[m.winner_id].wins++;
        });
        const kingId = Object.keys(scores).sort((a, b) => scores[b].wins - scores[a].wins)[0];
        if (!kingId) return null;
        return { ...participants[kingId], match_wins: scores[kingId].wins, buchholz: 0 };
    }, [swissMatches, participants]);

    // Transformed matches for bracket view (COMPLEX LOGIC PORTED FROM BRACKETPAGE)
    const transformedMatches = useMemo(() => {
        if (viewMode !== 'top_cut' || !matches) return []; // Use all matches to find bracket ones

        // Filter for top Cut only mainly, but we need to generate slots
        const cutSize = tournament?.cut_size || 4;

        // 1. Map real matches for easy lookup
        const realMatchMap = new Map<string, Match>();
        // Only look at top_cut matches
        const brackets = matches.filter(m => m.stage === 'top_cut');
        brackets.forEach(m => {
            realMatchMap.set(`${m.bracket_round}-${m.match_number}`, m);
        });

        // 2. Generate all expected slots based on cutSize
        const allSlots = [];
        const slotMap = new Map<string, string>(); // map "round-match" -> id

        const bracketSize = Math.pow(2, totalRounds);
        for (let r = 1; r <= totalRounds; r++) {
            const matchCount = bracketSize / Math.pow(2, r);
            for (let m = 1; m <= matchCount; m++) {
                const key = `${r}-${m}`;
                const realMatch = realMatchMap.get(key);
                // Use real ID if exists, else ghost ID
                const id = realMatch ? realMatch.id : `ghost-${key}`;
                allSlots.push({ key, round: r, matchNum: m, realMatch, id });
                slotMap.set(key, id);
            }
        }

        // 3. Round Naming Helper
        const getRoundName = (round: number) => {
            if (round === totalRounds) return 'FINAL';
            if (round === totalRounds - 1) return 'SEMIFINAL';
            if (round === totalRounds - 2) return 'QUARTERFINAL';
            return `ROUND ${round}`;
        };

        // 4. Build Library Objects
        return allSlots.map(slot => {
            const { round, matchNum, realMatch, id } = slot;

            // Calculate Next Match ID
            let nextMatchId = null;
            if (round < totalRounds) {
                const nextRound = round + 1;
                const nextMatchNum = Math.ceil(matchNum / 2);
                nextMatchId = slotMap.get(`${nextRound}-${nextMatchNum}`) ?? null;
            }

            const pA = realMatch?.participant_a_id ? participants[realMatch.participant_a_id] : null;
            const pB = realMatch?.participant_b_id ? participants[realMatch.participant_b_id] : null;
            const isCompleted = realMatch?.status === 'complete';

            return {
                id: id,
                name: `M${matchNum}`,
                nextMatchId: nextMatchId,
                tournamentRoundText: getRoundName(round),
                startTime: '',
                state: isCompleted ? 'DONE' : 'SCHEDULED',
                participants: [
                    {
                        id: realMatch?.participant_a_id || `tbd-a-${id}`,
                        resultText: realMatch?.score_a?.toString() ?? '-',
                        isWinner: isCompleted && realMatch?.winner_id === realMatch?.participant_a_id,
                        status: isCompleted ? (realMatch?.winner_id === realMatch?.participant_a_id ? 'WON' : 'LOST') : null,
                        name: pA?.display_name || (realMatch ? 'BYE' : 'TBD'),
                    },
                    {
                        id: realMatch?.participant_b_id || `tbd-b-${id}`,
                        resultText: realMatch?.score_b?.toString() ?? '-',
                        isWinner: isCompleted && realMatch?.winner_id === realMatch?.participant_b_id,
                        status: isCompleted ? (realMatch?.winner_id === realMatch?.participant_b_id ? 'WON' : 'LOST') : null,
                        name: pB?.display_name || (realMatch ? 'BYE' : 'TBD'),
                    }
                ]
            };
        });
    }, [matches, participants, viewMode, tournament?.cut_size, totalRounds]);

    // Calculate basic Win/Loss stats for card display
    const participantStats = useMemo(() => {
        if (!matches || !participants) return {};
        const stats: Record<string, { wins: number; losses: number }> = {};
        Object.keys(participants).forEach(id => { stats[id] = { wins: 0, losses: 0 } });

        matches.forEach(m => {
            if (m.status === 'complete' && m.winner_id) {
                if (stats[m.winner_id]) stats[m.winner_id].wins++;
                const loserId = m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id;
                if (loserId && stats[loserId]) stats[loserId].losses++;
            }
        });
        return stats;
    }, [matches, participants]);

    // 0. Check for LIVE STREAM (Moved up to avoid conditional hook call)
    // Blacklist for failed streams
    const [failedStreams, setFailedStreams] = useState<string[]>([]);

    const streamingMatch = useMemo(() => {
        if (!matches) return null;
        return matches.find(m => m.metadata?.broadcaster_id && !failedStreams.includes(m.metadata.broadcaster_id));
    }, [matches, failedStreams]);

    const handleStreamError = (broadcasterId: string) => {
        console.warn("Stream failed, adding to blacklist:", broadcasterId);
        setFailedStreams(prev => [...prev, broadcasterId]);
    };

    // ProjectorBracketMatch and Controls are now defined outside this function (module scope)

    // Loading guard — MUST be placed after all hooks to respect Rules of Hooks
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (streamingMatch && streamingMatch.metadata?.broadcaster_id) {
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <LiveCameraFeed
                    matchId={streamingMatch.id}
                    broadcasterId={streamingMatch.metadata.broadcaster_id}
                    onError={() => handleStreamError(streamingMatch.metadata.broadcaster_id)}
                />
                {/* Overlay Controls if needed, e.g. exit */}
                <div className="absolute top-4 right-4 z-[60]">
                    <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
                </div>
                {/* Optional: Overlay Scoreboard? LiveCameraFeed is usually full screen */}
            </div>
        );
    }

    // 1. Tournament Complete / Winner View (Custom Inline Layout)
    if (tournament?.status === 'completed' || (viewMode === 'top_cut' && winner)) {
        return (
            <BrandedContainer
                primaryColor={tournament?.stores?.primary_color}
                secondaryColor={tournament?.stores?.secondary_color}
                plan={tournament?.stores?.plan}
                className="min-h-screen bg-black overflow-hidden relative font-sans text-white flex flex-col"
            >
                {/* Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/10 via-slate-900 to-black pointer-events-none" />

                {/* Header */}
                <header className="p-8 w-full flex justify-between items-start z-20">
                    <div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm mb-2">
                            {tournament?.name || "Tournament Complete"}
                        </h1>
                        <p className="text-slate-400 text-xl font-medium tracking-wide uppercase">
                            {tournament?.stores?.name || "Official Result"}
                        </p>
                    </div>
                    <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
                </header>

                {/* Podium Area - Scaled Up */}
                <div className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-8 pb-12 z-10">
                    <div className="flex items-end justify-center gap-12 w-full translate-y-[-5%]">

                        {/* 2nd Place */}
                        <div className="order-1 flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-1000 delay-100">
                            <div className="flex flex-col items-center w-full">
                                <Crown className="w-16 h-16 text-slate-400 mb-4 opacity-50" />
                                <div className="w-48 h-48 rounded-full border-8 border-slate-400/30 bg-slate-400/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(148,163,184,0.1)]">
                                    <span className="text-7xl font-black text-slate-400">2</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-4xl text-slate-200 mb-2 truncate max-w-[300px]">{runnerUp?.display_name || "TBD"}</div>
                                    <div className="text-lg font-bold text-slate-500 uppercase tracking-[0.2em]">Runner Up</div>
                                </div>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="order-2 flex flex-col items-center w-1/3 -mt-24 z-20 animate-in slide-in-from-bottom-24 duration-1000">
                            <div className="flex flex-col items-center w-full transform scale-110">
                                <Crown className="w-24 h-24 text-yellow-400 mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                                <div className="w-64 h-64 rounded-full border-8 border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-yellow-900/20 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(234,179,8,0.3)] ring-4 ring-yellow-500/10">
                                    <span className="text-9xl font-black text-yellow-400">1</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-black text-6xl text-yellow-500 drop-shadow-lg mb-3 truncate max-w-[400px]">{winner?.display_name || "TBD"}</div>
                                    <div className="text-xl font-bold text-yellow-600/70 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                        <Trophy className="w-6 h-6" /> Champion
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-1000 delay-200">
                            <div className="flex flex-col items-center w-full">
                                <Crown className="w-16 h-16 text-amber-700 mb-4 opacity-50" />
                                <div className="w-48 h-48 rounded-full border-8 border-amber-700/30 bg-amber-700/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(180,83,9,0.1)]">
                                    <span className="text-7xl font-black text-amber-700">3</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-4xl text-slate-200 mb-2 truncate max-w-[300px]">{thirdPlace?.display_name || "TBD"}</div>
                                    <div className="text-lg font-bold text-amber-800/70 uppercase tracking-[0.2em]">3rd Place</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Area with Swiss King and QR */}
                <div className="w-full p-8 flex justify-between items-end z-20">
                    {/* Swiss King */}
                    <div className="flex items-center gap-6">
                        {swissKing && (
                            <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex items-center gap-6 backdrop-blur-md">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30 text-blue-400">
                                    <Medal className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Swiss King</div>
                                    <div className="font-bold text-3xl text-slate-200">{swissKing.display_name}</div>
                                    <div className="text-sm text-slate-400">{swissKing.match_wins} Wins • {swissKing.buchholz} Buchholz</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Powered By & QR */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-slate-600 opacity-60">
                            <span className="text-sm font-black uppercase tracking-widest font-mono">BeyBracket</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-2xl">
                            <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={100} />
                            <div className="text-center text-[10px] font-bold mt-1 text-black">Scan Results</div>
                        </div>
                    </div>
                </div>
            </BrandedContainer>
        );
    }

    // 2. Ongoing Bracket / Swiss View
    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center relative overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />

            {/* Header */}
            <header className="w-full flex justify-between items-center mb-12 z-10 relative">
                <div>
                    <div className="text-5xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
                        {tournament?.name}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xl text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            {viewMode === 'swiss' ? 'Swiss Stage' : 'Finals Stage'}
                        </div>
                    </div>
                </div>
                <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
            </header>

            {/* Main Content - Universal Cycling Dashboard */}
            <main className="flex-1 w-full flex overflow-hidden z-10">
                {/* Left: Content Area */}
                <div className={cn("flex-1 p-8 overflow-y-auto no-scrollbar relative flex flex-col", viewMode === 'swiss' ? 'border-r border-white/5' : '')}>

                    {/* View Switcher Container (For Top Cut) */}
                    {(viewMode === 'swiss' || topCutViewMode === 'grid' || activeGridMatches.length === 0) ? (
                        <div className="flex-1 flex flex-col">
                            {/* Round Header for Grid */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                                    <h2 className="text-3xl font-black uppercase tracking-widest text-white italic">
                                        {viewMode === 'swiss' ? 'Active Pairings' : 'Elimination Matches'}
                                    </h2>
                                </div>
                                <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xl text-cyan-400">
                                    {activeRoundName}
                                </div>
                            </div>

                            {activeGridMatches.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 font-thin uppercase tracking-widest bg-slate-900/20 rounded-3xl border border-white/5 border-dashed">
                                    <div className="text-8xl mb-6 opacity-10">
                                        {viewMode === 'swiss' ? <Medal className="w-32 h-32 mx-auto" /> : <Trophy className="w-32 h-32 mx-auto" />}
                                    </div>
                                    <div className="text-4xl font-black text-slate-500">Round Complete</div>
                                    <div className="text-xl text-slate-600 mt-2">Check the bracket or wait for standings...</div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    {/* Grid Layout */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 w-full auto-rows-fr flex-1 content-start">
                                        {activeGridMatches.slice(safeCurrentPage * MATCHES_PER_PAGE, (safeCurrentPage + 1) * MATCHES_PER_PAGE).map(m => (
                                            <div key={m.id} className="min-h-[140px]">
                                                <ProjectorMatchCard
                                                    match={m}
                                                    participants={participants || {}}
                                                    participantStats={participantStats}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination Indicator */}
                                    {totalPages > 1 && (
                                        <div className="mt-8 flex justify-center items-center gap-3">
                                            {Array.from({ length: totalPages }).map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "h-2 rounded-full transition-all duration-700",
                                                        idx === safeCurrentPage ? "w-12 bg-cyan-400" : "w-3 bg-slate-700"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Bracket Mode (Top Cut only) */
                        <div className="flex-1 flex flex-col animate-in fade-in zoom-in duration-1000">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                    <h2 className="text-3xl font-black uppercase tracking-widest text-white italic">Tournament Bracket</h2>
                                </div>
                                <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xl text-yellow-500">
                                    {activeRoundName || "Road to Final"}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 flex items-center justify-start overflow-x-hidden relative" ref={(el) => {
                                // Auto-scroll logic
                                if (!el) return;
                                const scrollContainer = el;
                                if ((scrollContainer as any)._autoScrollInterval) {
                                    clearInterval((scrollContainer as any)._autoScrollInterval);
                                }
                                const startScrolling = () => {
                                    if (scrollContainer.scrollWidth <= scrollContainer.clientWidth) return;
                                    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                                    let direction = 1;
                                    let currentScroll = scrollContainer.scrollLeft;
                                    let isPaused = false;
                                    (scrollContainer as any)._autoScrollInterval = setInterval(() => {
                                        if (isPaused) return;
                                        currentScroll += direction * 1.5;
                                        if (currentScroll >= maxScroll) {
                                            currentScroll = maxScroll;
                                            isPaused = true;
                                            setTimeout(() => { direction = -1; isPaused = false; }, 4000);
                                        } else if (currentScroll <= 0) {
                                            currentScroll = 0;
                                            isPaused = true;
                                            setTimeout(() => { direction = 1; isPaused = false; }, 4000);
                                        }
                                        scrollContainer.scrollLeft = currentScroll;
                                    }, 20);
                                };
                                setTimeout(startScrolling, 1000);
                            }}>
                                <SingleEliminationBracket
                                    matches={transformedMatches}
                                    matchComponent={ProjectorBracketMatch}
                                    theme={BeybladeTheme}
                                    options={{
                                        style: {
                                            width: 320,
                                            boxHeight: 180,
                                            spaceBetweenColumns: 100,
                                            spaceBetweenRows: 40,
                                            connectorColor: '#334155',
                                            connectorColorHighlight: '#22D3EE',
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3rd Place Match Overlay (Bottom Center of Bracket Area) - Only for Top Cut */}
                {viewMode === 'top_cut' && (() => {
                    const p3Match = topCutMatches.find(m => Number(m.bracket_round) === totalRounds && Number(m.match_number) === 2);
                    if (!p3Match) return null;

                    const p3Transformed = {
                        participants: [
                            {
                                id: p3Match.participant_a_id || 'tbd-a-3rd',
                                resultText: p3Match.score_a?.toString() ?? '-',
                                isWinner: p3Match.winner_id === p3Match.participant_a_id,
                                status: p3Match.status === 'complete' ? (p3Match.winner_id === p3Match.participant_a_id ? 'WON' : 'LOST') : null,
                                name: p3Match.participant_a_id ? (participants ? participants[p3Match.participant_a_id]?.display_name : 'TBD') : 'TBD',
                            },
                            {
                                id: p3Match.participant_b_id || 'tbd-b-3rd',
                                resultText: p3Match.score_b?.toString() ?? '-',
                                isWinner: p3Match.winner_id === p3Match.participant_b_id,
                                status: p3Match.status === 'complete' ? (p3Match.winner_id === p3Match.participant_b_id ? 'WON' : 'LOST') : null,
                                name: p3Match.participant_b_id ? (participants ? participants[p3Match.participant_b_id]?.display_name : 'TBD') : 'TBD',
                            }
                        ]
                    };

                    return (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                            <div className="mb-2 text-sm font-bold uppercase tracking-widest text-amber-600/80">3rd Place Match</div>
                            <ProjectorBracketMatch match={p3Transformed} />
                        </div>
                    );
                })()}

                {/* Right: Sidebar */}
                <div className="hidden xl:flex w-[320px] shrink-0 border-l border-white/5 flex-col bg-slate-900/40 backdrop-blur-xl">
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <LiveStandings participants={participants || {}} matches={swissMatches || []} />
                    </div>

                    {/* QR Code integrated into sidebar */}
                    <div className="p-6 border-t border-white/5 bg-slate-900/80">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-lg shrink-0 shadow-lg">
                                <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={70} />
                            </div>
                            <div>
                                <div className="text-base font-bold text-slate-200 leading-tight">Live Updates</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">beybracket.com</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                    <span className="text-[10px] text-cyan-500/80 font-bold uppercase">Real-time sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating QR (Mobile/Tablet only, hidden when sidebar is visible) */}
            <div className="xl:hidden absolute bottom-12 right-12 flex items-center gap-6 z-20 bg-slate-900/90 p-6 rounded-2xl backdrop-blur-xl border border-slate-800 shadow-2xl">
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-200">Live Updates</div>
                    <div className="text-sm text-slate-500">beybracket.com</div>
                </div>
                <div className="bg-white p-2 rounded-lg">
                    <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={80} />
                </div>
            </div>

        </BrandedContainer>
    );
}
