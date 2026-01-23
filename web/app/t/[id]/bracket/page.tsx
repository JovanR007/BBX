"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import React from 'react';
import { ArrowLeft, Trophy, Info, Loader2, PlayCircle, AlertCircle, Wand2, Trash2, Crown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Match, Participant } from "@/types";

// Hooks
import { useBracketData } from "@/hooks/use-bracket-data";
import { useBracketActions } from "@/hooks/use-bracket-actions";

// Components
import { MatchScoringModal } from "@/components/features/match-scoring-modal";
import { ConfirmationModal } from "@/components/ui/modal";
import { BracketConnector } from "@/components/features/bracket-connector";
import { VictoryModal } from "@/components/features/victory-modal";
import { ConcludeModal } from "@/components/features/conclude-modal";
import { BrandedContainer } from "@/components/features/branded-container";

// --- Page Component ---
export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);

    // Data Hook
    const {
        loading,
        viewMode,
        tournament,
        matches,
        participants,
        refresh,
        derived: {
            // ... (other derived props assumed, just destructure needed ones)
            swissMatches,
            maxSwissRound,
            currentSwissMatches,
            isSwissRoundComplete,
            isSwissFinished,
            topCutMatches,
            maxBracketRound,
            currentBracketMatches,
            isBracketRoundComplete,
            isTournamentComplete,
            winner,
            runnerUp,
            thirdPlace,
            permissions
        }
    } = useBracketData(tournamentId);

    // Helpers
    const { isOwner, isJudge } = permissions || { isOwner: false, isJudge: false };
    const canEdit = isOwner || isJudge;

    // Actions Hook
    const {
        advancing,
        confirmState,
        showVictoryModal,
        concludePinOpen,
        setConfirmState,
        setShowVictoryModal,
        setConcludePinOpen,
        handleAdvanceCheck,
        handleProceedCheck,
        executeConfirmation,
        handleAutoScore,
        handleResetRound,
        handleConclude
    } = useBracketActions(tournamentId, refresh);

    // Local UI State
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="container mx-auto px-4 py-8 min-h-screen flex flex-col"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <Link href={`/t/${tournamentId}`} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                {/* Swiss Controls */}
                {viewMode === "swiss" && !isSwissFinished && maxSwissRound > 0 && (
                    <SwissControls
                        isRoundComplete={isSwissRoundComplete}
                        currentSwissMatches={currentSwissMatches}
                        maxSwissRound={maxSwissRound}
                        advancing={advancing}
                        onAdvance={handleAdvanceCheck}
                        canAdvance={canEdit}
                    />
                )}

                {/* Swiss Finished -> Proceed */}
                {viewMode === "swiss" && isSwissFinished && canEdit && (
                    <button onClick={handleProceedCheck} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded font-bold shadow-lg animate-pulse flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> Proceed to Elimination Stage
                    </button>
                )}

                {/* Top Cut Controls */}
                {viewMode === "top_cut" && (
                    <TopCutControls
                        isBracketRoundComplete={isBracketRoundComplete}
                        isTournamentComplete={isTournamentComplete}
                        currentBracketMatches={currentBracketMatches}
                        maxBracketRound={maxBracketRound}
                        advancing={advancing}
                        tournamentStatus={tournament?.status}
                        onAdvance={handleAdvanceCheck}
                        onShowVictory={() => setShowVictoryModal(true)}
                        onConclude={() => setConcludePinOpen(true)}
                        canAdvance={canEdit}
                    />
                )}
            </div>

            {/* Title & Debug */}
            <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">
                    {viewMode === "top_cut" ? "Elimination Bracket" : "Swiss Standings & Matches"}
                </h1>
                {isOwner && (
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={handleAutoScore} disabled={advancing} className="flex items-center gap-2 text-xs font-mono text-purple-500 hover:text-purple-400 border border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 px-3 py-1 rounded-full transition-all" title="Debug: Randomly score all pending matches">
                            <Wand2 className="w-3 h-3" /> Auto-Resolve
                        </button>
                        <button onClick={handleResetRound} disabled={advancing} className="flex items-center gap-2 text-xs font-mono text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/50 bg-red-500/5 px-3 py-1 rounded-full transition-all" title="Debug: Delete latest round matches">
                            <Trash2 className="w-3 h-3" /> Reset Round
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-grow overflow-x-auto pb-6">
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div> Loading tournament data...</div>
                ) : viewMode === "empty" ? (
                    <div className="p-12 border border-dashed rounded-xl text-center text-muted-foreground">
                        <Info className="w-8 h-8 mx-auto mb-4 opacity-50" />
                        <p>No matches found yet.</p>
                        <p className="text-sm">The tournament hasn't started.</p>
                    </div>
                ) : viewMode === "swiss" ? (
                    <>
                        <div className="mb-8 overflow-x-auto">
                            <BracketConnector matches={swissMatches} match_target_points={tournament?.match_target_points ?? 4} />
                        </div>
                        <SwissView matches={swissMatches} participants={participants} onMatchClick={(m) => canEdit && setSelectedMatch(m)} />
                    </>
                ) : (
                    <TopCutView matches={topCutMatches} participants={participants} cutSize={tournament?.cut_size ?? 0} onMatchClick={(m) => canEdit && setSelectedMatch(m)} />
                )}
            </div>

            {/* Modals */}
            <MatchScoringModal isOpen={!!selectedMatch} match={selectedMatch} participants={participants} onClose={() => setSelectedMatch(null)} refresh={refresh} />
            <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title || ""} description={confirmState.description || ""} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} onConfirm={executeConfirmation} isLoading={advancing} confirmText={confirmState.type === 'proceed' ? "Proceed" : "Start Round"} />
            <VictoryModal isOpen={showVictoryModal} onClose={() => setShowVictoryModal(false)} winner={winner} runnerUp={runnerUp} thirdPlace={thirdPlace} swissKing={null} tournamentName={tournament?.name ?? ""} organizerName={tournament?.store_id || ""} />
            <ConcludeModal isOpen={concludePinOpen} onClose={() => setConcludePinOpen(false)} onConfirm={handleConclude} loading={advancing} />
        </BrandedContainer>
    );
}

// --- Sub-Components ---

function SwissControls({ isRoundComplete, currentSwissMatches, maxSwissRound, advancing, onAdvance, canAdvance = false }: { isRoundComplete: boolean; currentSwissMatches: Match[]; maxSwissRound: number; advancing: boolean; onAdvance: (r: number) => void; canAdvance?: boolean }) {
    if (!isRoundComplete) {
        return (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-sm font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>Matches In Progress ({currentSwissMatches.filter(m => m.status === 'complete').length}/{currentSwissMatches.length})</span>
            </div>
        );
    }
    if (!canAdvance) return null;
    return (
        <button onClick={() => onAdvance(maxSwissRound)} disabled={advancing} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100">
            {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Start Round {maxSwissRound + 1}
        </button>
    );
}

function TopCutControls({ isBracketRoundComplete, isTournamentComplete, currentBracketMatches, maxBracketRound, advancing, tournamentStatus, onAdvance, onShowVictory, onConclude, canAdvance = false }: { isBracketRoundComplete: boolean; isTournamentComplete: boolean; currentBracketMatches: Match[]; maxBracketRound: number; advancing: boolean; tournamentStatus?: string; onAdvance: (r: number) => void; onShowVictory: () => void; onConclude: () => void; canAdvance?: boolean }) {
    if (!isBracketRoundComplete) {
        return (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-sm font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>Matches In Progress ({currentBracketMatches.filter(m => m.status === 'complete').length}/{currentBracketMatches.length})</span>
            </div>
        );
    }
    if (!isTournamentComplete) {
        if (!canAdvance) return null;
        return (
            <button onClick={() => onAdvance(maxBracketRound)} disabled={advancing} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100">
                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                Start Next Round
            </button>
        );
    }
    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20 text-sm font-bold">
                <Trophy className="w-4 h-4" />
                <span>Tournament Complete</span>
            </div>
            {tournamentStatus === 'completed' ? (
                <button onClick={onShowVictory} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 transition-all font-bold">
                    <Crown className="w-3 h-3" /> View Podium
                </button>
            ) : canAdvance && (
                <button onClick={onConclude} className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-3 py-1 rounded font-bold transition-colors">
                    Conclude Tournament
                </button>
            )}
        </div>
    );
}

function SwissView({ matches, participants, onMatchClick }: { matches: Match[], participants: Record<string, Participant>, onMatchClick: (m: Match) => void }) {
    const rounds: Record<number, Match[]> = {};
    matches.forEach(m => {
        if (!rounds[m.swiss_round_number]) rounds[m.swiss_round_number] = [];
        rounds[m.swiss_round_number].push(m);
    });
    const roundsList = Object.keys(rounds).sort((a, b) => Number(a) - Number(b));
    const maxRound = roundsList.length > 0 ? roundsList[roundsList.length - 1] : 0;

    return (
        <div className="flex flex-row gap-8 pb-12 min-w-max">
            {roundsList.map(rNumStr => {
                const rNum = Number(rNumStr);
                const isLastRound = rNum === Number(maxRound);
                return (
                    <div key={rNum} className="flex flex-col gap-4 min-w-[280px]">
                        <div className="text-center font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">Round {rNum}</div>
                        <div className="flex flex-col gap-3">
                            {(rounds[rNum] || []).map((m, idx) => (
                                <MatchCard key={m.id} match={m} participants={participants} onClick={() => onMatchClick(m)} isSwissKing={isLastRound && idx === 0 && Number(rNum) >= 5} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TopCutView({ matches, participants, onMatchClick, cutSize }: { matches: Match[], participants: Record<string, Participant>, onMatchClick: (m: Match) => void, cutSize: number }) {
    // Import the library dynamically to avoid SSR issues
    const [LibraryComponents, setLibraryComponents] = useState<any>(null);

    useEffect(() => {
        import('react-tournament-brackets').then(mod => {
            setLibraryComponents(mod);
        });
    }, []);

    // Transform our match data to the library's format
    const transformedMatches = useMemo(() => {
        if (!matches.length) return [];

        // Sort matches by bracket_round and match_number
        const sortedMatches = [...matches].sort((a, b) => {
            if (a.bracket_round !== b.bracket_round) return a.bracket_round - b.bracket_round;
            return a.match_number - b.match_number;
        });

        // Find max round (for finals detection)
        const maxRound = Math.max(...sortedMatches.map(m => Number(m.bracket_round)));

        return sortedMatches
            .filter(m => {
                // Exclude 3rd place match (match_number 2 in final round)
                if (Number(m.bracket_round) === maxRound && m.match_number === 2) return false;
                return true;
            })
            .map(m => {
                const pA = m.participant_a_id ? participants[m.participant_a_id] : null;
                const pB = m.participant_b_id ? participants[m.participant_b_id] : null;

                // Calculate nextMatchId based on bracket logic
                const nextRound = Number(m.bracket_round) + 1;
                const nextMatchNumber = Math.ceil(m.match_number / 2);
                const nextMatch = sortedMatches.find(nm =>
                    Number(nm.bracket_round) === nextRound && nm.match_number === nextMatchNumber
                );

                return {
                    id: m.id,
                    name: `Match ${m.match_number}`,
                    nextMatchId: nextMatch?.id ?? null,
                    tournamentRoundText: `Round ${m.bracket_round}`,
                    startTime: m.created_at,
                    state: m.status === 'complete' ? 'DONE' : 'SCHEDULED',
                    participants: [
                        {
                            id: m.participant_a_id || `bye-a-${m.id}`,
                            resultText: m.score_a?.toString() ?? '',
                            isWinner: m.winner_id === m.participant_a_id,
                            status: m.status === 'complete' ? 'PLAYED' : null,
                            name: pA?.display_name || 'TBD'
                        },
                        {
                            id: m.participant_b_id || `bye-b-${m.id}`,
                            resultText: m.score_b?.toString() ?? '',
                            isWinner: m.winner_id === m.participant_b_id,
                            status: m.status === 'complete' ? 'PLAYED' : null,
                            name: pB?.display_name || 'TBD'
                        }
                    ]
                };
            });
    }, [matches, participants]);

    // Find 3rd place match
    const thirdPlaceMatch = useMemo(() => {
        if (!matches.length) return null;
        const maxRound = Math.max(...matches.map(m => Number(m.bracket_round)));
        return matches.find(m => Number(m.bracket_round) === maxRound && m.match_number === 2) || null;
    }, [matches]);

    // Store original match by ID for onClick handler
    const matchById = useMemo(() => {
        const map: Record<string, Match> = {};
        matches.forEach(m => { map[m.id] = m; });
        return map;
    }, [matches]);

    if (!LibraryComponents) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading bracket...</span>
            </div>
        );
    }

    const { SingleEliminationBracket, Match: LibMatch, SVGViewer, createTheme } = LibraryComponents;

    // Create a dark Beyblade theme
    const BeybladeTheme = createTheme({
        textColor: { main: '#E2E8F0', highlighted: '#22D3EE', dark: '#64748B' },
        matchBackground: { wonColor: '#0F172A', lostColor: '#0F172A' },
        score: {
            background: { wonColor: '#22D3EE', lostColor: '#334155' },
            text: { highlightedWonColor: '#000000', highlightedLostColor: '#E2E8F0' },
        },
        border: {
            color: '#334155',
            highlightedColor: '#22D3EE',
        },
        roundHeader: { backgroundColor: '#1E293B', fontColor: '#94A3B8' },
        connectorColor: '#334155',
        connectorColorHighlight: '#22D3EE',
        svgBackground: '#020617',
    });

    return (
        <div className="flex flex-col gap-16 pb-24">
            <div className="overflow-auto">
                <SingleEliminationBracket
                    matches={transformedMatches}
                    matchComponent={LibMatch}
                    theme={BeybladeTheme}
                    options={{
                        style: {
                            roundHeader: {
                                backgroundColor: BeybladeTheme.roundHeader.backgroundColor,
                                fontColor: BeybladeTheme.roundHeader.fontColor,
                            },
                            connectorColor: BeybladeTheme.connectorColor,
                            connectorColorHighlight: BeybladeTheme.connectorColorHighlight,
                        },
                    }}
                    onMatchClick={(match: any) => {
                        const originalMatch = matchById[match.id];
                        if (originalMatch) onMatchClick(originalMatch);
                    }}
                    svgWrapper={({ children, ...props }: any) => (
                        <SVGViewer
                            background={BeybladeTheme.svgBackground}
                            SVGBackground={BeybladeTheme.svgBackground}
                            width={Math.max(cutSize * 400, 800)}
                            height={Math.max(cutSize * 100, 600)}
                            {...props}
                        >
                            {children}
                        </SVGViewer>
                    )}
                />
            </div>

            {thirdPlaceMatch && (
                <div className="flex justify-start pl-8 pt-8 border-t border-white/5">
                    <div className="w-[320px] flex flex-col items-center gap-6 p-8 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-[1px] w-8 bg-slate-800" />
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">3rd Place Match</div>
                            <div className="h-[1px] w-8 bg-slate-800" />
                        </div>
                        <MatchCard match={thirdPlaceMatch} participants={participants} onClick={() => onMatchClick(thirdPlaceMatch!)} label={null} />
                    </div>
                </div>
            )}
        </div>
    );
}

interface MatchCardProps {
    match: Match;
    participants: Record<string, Participant>;
    onClick?: () => void;
    label?: string | null;
    isSwissKing?: boolean;
    nextMatchNumber?: number | null;
    isHighlighted?: boolean;
    isSource?: boolean;
    isTarget?: boolean;
}

function MatchCard({ match, participants, onClick, label, isSwissKing, nextMatchNumber, isHighlighted, isSource, isTarget }: MatchCardProps) {
    const winnerId = match.winner_id;
    const isCompleted = match.status === "complete";
    const pA = match.participant_a_id ? participants[match.participant_a_id] : null;
    const pB = match.participant_b_id ? participants[match.participant_b_id] : null;
    const isIncomplete = match.status !== 'complete';
    const showPulse = isIncomplete && match.stage === 'top_cut';

    return (
        <div className={cn(
            "relative w-full transition-all duration-500",
            isHighlighted ? "scale-[1.02] z-20" : "opacity-80 scale-[0.98] grayscale-[0.3]"
        )}>
            {/* Advance "Synapse" Port (Right) */}
            {nextMatchNumber && (
                <div className={cn(
                    "absolute -right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30 transition-all duration-300",
                    isHighlighted ? "opacity-100 translate-x-1" : "opacity-40"
                )}>
                    <div className={cn(
                        "w-6 h-6 rounded-full bg-slate-950 border flex items-center justify-center shadow-lg",
                        isHighlighted ? "border-primary shadow-primary/40 pulse-glow" : "border-white/20"
                    )}>
                        <ArrowLeft className="w-3 h-3 rotate-180 text-primary" />
                    </div>
                    <span className="text-[8px] font-black text-primary bg-slate-950 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        TO M{nextMatchNumber}
                    </span>
                </div>
            )}

            {/* Source "Synapse" Port (Left) - Only visible when highlighted as target */}
            {isTarget && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30 animate-in fade-in slide-in-from-right-2 duration-500">
                    <span className="text-[8px] font-black text-primary bg-slate-950 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        FROM M{match.match_number}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-950 border border-primary flex items-center justify-center shadow-lg shadow-primary/40 pulse-glow">
                        <ArrowLeft className="w-3 h-3 text-primary" />
                    </div>
                </div>
            )}

            <div
                onClick={onClick}
                className={cn(
                    "border rounded-2xl bg-slate-900/90 backdrop-blur-xl p-4 shadow-2xl w-full relative transition-all cursor-pointer overflow-hidden",
                    match.stage === 'top_cut' ? "border-white/10" : "border-border",
                    isHighlighted ? "border-primary/50 ring-1 ring-primary/20 bg-slate-800/95" : "hover:border-white/20",
                    showPulse && !isSwissKing ? "border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.1)]" : "",
                    isSwissKing ? "border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] bg-gradient-to-br from-yellow-500/10 to-transparent" : ""
                )}
            >
                {/* Decorative scanning line for highlighted cards */}
                {isHighlighted && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
                )}

                {showPulse && !isSwissKing && (<div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />)}
                {isSwissKing && (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] uppercase font-black tracking-widest z-10 shadow-lg flex items-center gap-1"><Crown className="w-3 h-3" /> Swiss King Battle</div>)}

                <div className="flex flex-col gap-2">
                    <div className={cn(
                        "flex justify-between items-center p-3 rounded-xl transition-all",
                        winnerId === match.participant_a_id && isCompleted ? "bg-primary/20 text-primary font-bold shadow-[inset_0_0_15px_rgba(var(--primary),0.1)]" : "bg-white/5"
                    )}>
                        <div className="flex items-center gap-2">
                            {winnerId === match.participant_a_id && isCompleted && <Trophy className="w-3 h-3" />}
                            <span className="text-xs truncate w-[140px] uppercase tracking-wide" title={pA?.display_name || "BYE"}>
                                {pA?.display_name || "BYE"}
                                {pA?.dropped && <span className="ml-2 text-[9px] text-red-500 font-black opacity-60">DROPPED</span>}
                            </span>
                        </div>
                        <span className="font-mono text-sm opacity-80">{match.score_a}</span>
                    </div>
                    <div className={cn(
                        "flex justify-between items-center p-3 rounded-xl transition-all",
                        winnerId === match.participant_b_id && isCompleted ? "bg-primary/20 text-primary font-bold shadow-[inset_0_0_15px_rgba(var(--primary),0.1)]" : "bg-white/5"
                    )}>
                        <div className="flex items-center gap-2">
                            {winnerId === match.participant_b_id && isCompleted && <Trophy className="w-3 h-3" />}
                            <span className="text-xs truncate w-[140px] uppercase tracking-wide" title={pB?.display_name || "BYE"}>
                                {pB?.display_name || "BYE"}
                                {pB?.dropped && <span className="ml-2 text-[9px] text-red-500 font-black opacity-60">DROPPED</span>}
                            </span>
                        </div>
                        <span className="font-mono text-sm opacity-80">{match.score_b}</span>
                    </div>
                </div>

                <div className="mt-3 text-[10px] text-white/30 flex justify-between uppercase items-center font-black tracking-[0.2em]">
                    <span className="bg-white/5 px-2 py-0.5 rounded-md">MATCH {match.match_number}</span>
                    {isCompleted && (<span className="text-primary flex items-center gap-1 opacity-80">VERIFIED</span>)}
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 5px rgba(34, 211, 238, 0.4); }
                    50% { box-shadow: 0 0 15px rgba(34, 211, 238, 0.7); }
                }
                .pulse-glow {
                    animation: pulse-glow 2s infinite ease-in-out;
                }
                @keyframes scan {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(200%); }
                }
                .animate-scan {
                    animation: scan 4s linear infinite;
                }
            `}</style>
        </div>
    );
}
