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
    const { isOwner, isJudge, isSuperAdmin } = permissions || { isOwner: false, isJudge: false, isSuperAdmin: false };
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
                        {isSuperAdmin && (
                            <button onClick={handleResetRound} disabled={advancing} className="flex items-center gap-2 text-xs font-mono text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/50 bg-red-500/5 px-3 py-1 rounded-full transition-all" title="Debug: Delete latest round matches">
                                <Trash2 className="w-3 h-3" /> Reset Round
                            </button>
                        )}
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
            <VictoryModal isOpen={showVictoryModal} onClose={() => setShowVictoryModal(false)} winner={winner} runnerUp={runnerUp} thirdPlace={thirdPlace} swissKing={null} tournamentName={tournament?.name ?? ""} organizerName={tournament?.stores?.name || "Official Result"} />
            <ConcludeModal isOpen={concludePinOpen} onClose={() => setConcludePinOpen(false)} onConfirm={handleConclude} loading={advancing} isCasual={!tournament?.store_id} />
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
                    <div key={rNum} className="flex flex-col gap-4 min-w-[200px]">
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

        // Get round names
        const getRoundName = (round: number) => {
            if (round === maxRound) return 'Finals';
            if (round === maxRound - 1) return 'Semifinals';
            if (round === maxRound - 2) return 'Quarterfinals';
            return `${round}`;
        };

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
                    name: `M${m.match_number}`,
                    nextMatchId: nextMatch?.id ?? null,
                    tournamentRoundText: getRoundName(Number(m.bracket_round)),
                    startTime: null,
                    state: m.status === 'complete' ? 'DONE' : 'SCHEDULED',
                    participants: [
                        {
                            id: m.participant_a_id || `bye-a-${m.id}`,
                            resultText: m.score_a?.toString() ?? '-',
                            isWinner: m.winner_id === m.participant_a_id && m.status === 'complete',
                            status: m.status === 'complete' ? 'PLAYED' : null,
                            name: pA?.display_name || 'BYE'
                        },
                        {
                            id: m.participant_b_id || `bye-b-${m.id}`,
                            resultText: m.score_b?.toString() ?? '-',
                            isWinner: m.winner_id === m.participant_b_id && m.status === 'complete',
                            status: m.status === 'complete' ? 'PLAYED' : null,
                            name: pB?.display_name || 'BYE'
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

    const { SingleEliminationBracket, createTheme } = LibraryComponents;

    // Create a dark Beyblade theme
    const BeybladeTheme = createTheme({
        textColor: { main: '#E2E8F0', highlighted: '#22D3EE', dark: '#64748B' },
        matchBackground: { wonColor: '#1E293B', lostColor: '#0F172A' },
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
        svgBackground: 'transparent',
    });

    // Custom match component with always-visible scores
    const CustomMatch = ({
        match,
        onMatchClick: libOnMatchClick,
        onPartyClick,
        onMouseEnter,
        onMouseLeave,
        topParty,
        bottomParty,
        topWon,
        bottomWon,
        topHovered,
        bottomHovered,
        topText,
        bottomText,
        connectorColor,
        computedStyles,
        teamNameFallback,
        resultFallback,
    }: any) => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                background: '#0F172A',
                borderRadius: '8px',
                border: '1px solid #334155',
                overflow: 'hidden',
                cursor: 'pointer',
            }}
            onClick={() => {
                const originalMatch = matchById[match.id];
                if (originalMatch) onMatchClick(originalMatch);
            }}
        >
            {/* Top Player */}
            <div
                onMouseEnter={() => onMouseEnter(topParty.id)}
                onMouseLeave={onMouseLeave}
                style={{
                    display: 'flex',
                    flex: '1',
                    height: '50%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    background: topWon ? '#22D3EE' : topHovered ? '#1E293B' : 'transparent',
                    borderBottom: '1px solid #334155',
                    transition: 'background 0.2s',
                }}
            >
                <span style={{
                    color: topWon ? '#000000' : '#E2E8F0',
                    fontSize: '11px',
                    fontWeight: topWon ? 'bold' : 'normal',
                    paddingRight: '8px',
                    wordBreak: 'break-word',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.1',
                }}>
                    {topParty.name || teamNameFallback}
                </span>
                <span style={{
                    color: topWon ? '#000000' : '#94A3B8',
                    fontSize: '12px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    minWidth: '20px',
                    textAlign: 'right',
                    opacity: topWon ? 1 : 0.6,
                }}>
                    {topParty.resultText || '-'}
                </span>
            </div>
            {/* Bottom Player */}
            <div
                onMouseEnter={() => onMouseEnter(bottomParty.id)}
                onMouseLeave={onMouseLeave}
                style={{
                    display: 'flex',
                    flex: '1',
                    height: '50%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    background: bottomWon ? '#22D3EE' : bottomHovered ? '#1E293B' : 'transparent',
                    transition: 'background 0.2s',
                }}
            >
                <span style={{
                    color: bottomWon ? '#000000' : '#E2E8F0',
                    fontSize: '11px',
                    fontWeight: bottomWon ? 'bold' : 'normal',
                    paddingRight: '8px',
                    wordBreak: 'break-word',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.1',
                }}>
                    {bottomParty.name || teamNameFallback}
                </span>
                <span style={{
                    color: bottomWon ? '#000000' : '#94A3B8',
                    fontSize: '12px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    minWidth: '20px',
                    textAlign: 'right',
                    opacity: bottomWon ? 1 : 0.6,
                }}>
                    {bottomParty.resultText || '-'}
                </span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-16 pb-24">
            {/* Scrollable bracket container - uses native horizontal scroll */}
            <div
                className="overflow-x-auto overflow-y-auto max-w-full pb-8 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 text-left"
                style={{
                    cursor: 'default',
                    scrollBehavior: 'smooth',
                    maxHeight: '70vh',
                }}
            >
                <div style={{ minWidth: 'max-content' }}>
                    <SingleEliminationBracket
                        matches={transformedMatches}
                        matchComponent={CustomMatch}
                        theme={BeybladeTheme}
                        options={{
                            style: {
                                width: 180,
                                boxHeight: 80,
                                spaceBetweenColumns: 60,
                                spaceBetweenRows: 24,
                                canvasPadding: 20,
                                roundHeader: {
                                    backgroundColor: 'transparent',
                                    fontColor: '#94A3B8',
                                    fontSize: 12,
                                    height: 30,
                                    marginBottom: 20,
                                    fontFamily: 'inherit',
                                },
                                connectorColor: '#334155',
                                connectorColorHighlight: '#22D3EE',
                            },
                        }}
                    />
                </div>
            </div>

            {thirdPlaceMatch && (
                <div className="flex justify-start px-8 pt-8 border-t border-white/5">
                    <div className="flex flex-col items-center gap-4 p-6 bg-slate-900/40 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">3rd Place Match</div>
                        <div className="w-[180px]">
                            <MatchCard
                                match={thirdPlaceMatch}
                                participants={participants}
                                onClick={() => onMatchClick(thirdPlaceMatch!)}
                            />
                        </div>
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

function MatchCard({ match, participants, onClick, isSwissKing, isHighlighted }: MatchCardProps) {
    const pA = match.participant_a_id ? participants[match.participant_a_id] : null;
    const pB = match.participant_b_id ? participants[match.participant_b_id] : null;
    const isCompleted = match.status === "complete";
    const winnerId = match.winner_id;
    const aWon = isCompleted && winnerId === match.participant_a_id;
    const bWon = isCompleted && winnerId === match.participant_b_id;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex flex-col w-full rounded-md border overflow-hidden cursor-pointer transition-all duration-200 shadow-lg",
                isSwissKing ? "border-yellow-500/50 shadow-yellow-500/10" : "border-slate-800",
                isHighlighted ? "border-cyan-500 ring-1 ring-cyan-500/20 scale-[1.02]" : "hover:border-slate-700"
            )}
            style={isSwissKing ? { background: 'linear-gradient(to bottom right, #0F172A, #1e1b10)' } : { background: '#0F172A' }}
        >
            {/* Swiss King Header */}
            {isSwissKing && (
                <div className="bg-yellow-500 py-0.5 px-2 flex items-center justify-center gap-1">
                    <Crown className="w-2 h-2 text-black" />
                    <span className="text-[8px] font-black text-black uppercase tracking-tighter">Swiss King Battle</span>
                </div>
            )}

            {/* Participant A */}
            <div className={cn(
                "flex flex-1 min-h-[40px] justify-between items-center px-2 py-1.5 transition-colors",
                aWon ? "bg-cyan-400" : "bg-transparent",
                !aWon && "border-b border-slate-800"
            )}>
                <span className={cn(
                    "text-[10px] uppercase font-bold tracking-tight break-words pr-2 line-clamp-2",
                    aWon ? "text-slate-950" : "text-slate-100"
                )}>
                    {pA?.display_name || "BYE"}
                </span>
                <span className={cn(
                    "text-xs font-black font-mono min-w-[20px] text-right",
                    aWon ? "text-slate-950" : "text-cyan-400 opacity-60"
                )}>
                    {match.score_a ?? "-"}
                </span>
            </div>

            {/* Participant B */}
            <div className={cn(
                "flex flex-1 min-h-[40px] justify-between items-center px-2 py-1.5 transition-colors",
                bWon ? "bg-cyan-400" : "bg-transparent"
            )}>
                <span className={cn(
                    "text-[10px] uppercase font-bold tracking-tight break-words pr-2 line-clamp-2",
                    bWon ? "text-slate-950" : "text-slate-100"
                )}>
                    {pB?.display_name || "BYE"}
                </span>
                <span className={cn(
                    "text-xs font-black font-mono min-w-[20px] text-right",
                    bWon ? "text-slate-950" : "text-cyan-400 opacity-60"
                )}>
                    {match.score_b ?? "-"}
                </span>
            </div>
        </div>
    );
}
