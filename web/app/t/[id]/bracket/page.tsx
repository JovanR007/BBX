"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import React from 'react';
import { ArrowLeft, Trophy, Info, Loader2, PlayCircle, AlertCircle, Wand2, Trash2, Crown, Eye } from "lucide-react";
import { DeckCard } from "@/components/decks/deck-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
import { LiveStandings } from "@/components/features/live-standings";

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

    // Calculate Swiss King (Best Swiss Performer)
    const swissKing = useMemo(() => {
        if (!swissMatches || swissMatches.length === 0) return null;
        // Simple calculation: Most Wins -> Best Diff -> Best BH (if we had specific BH data here, but we only have matches)
        // We can approximate by strictly wins for now, or fetch standings properly.
        // Actually, let's just find the player with most wins in Swiss.
        const scores: Record<string, { wins: number, diff: number }> = {};
        Object.keys(participants).forEach(pid => scores[pid] = { wins: 0, diff: 0 });

        swissMatches.forEach(m => {
            if (m.status !== 'complete' || !m.winner_id) return;
            if (scores[m.winner_id]) {
                scores[m.winner_id].wins++;
                // Diff logic... simplified
            }
        });

        // Find max
        const kingId = Object.keys(scores).sort((a, b) => scores[b].wins - scores[a].wins)[0];
        if (!kingId) return null;

        return {
            ...participants[kingId],
            match_wins: scores[kingId].wins,
            buchholz: 0 // Placeholder as we don't full calc here
        };
    }, [swissMatches, participants]);

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
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [selectedDeck, setSelectedDeck] = useState<any | null>(null);
    const selectedMatch = useMemo(() => matches.find(m => m.id === selectedMatchId) || null, [matches, selectedMatchId]);
    const currentlyStreamingMatch = useMemo(() => matches.find(m => m.metadata?.streaming_judge_id), [matches]);

    // Force "Tournament Completed" Modal Open on load if complete
    useEffect(() => {
        if (tournament?.status === 'completed' || (viewMode === 'top_cut' && winner)) {
            setShowVictoryModal(true);
        }
    }, [tournament?.status, viewMode, winner, setShowVictoryModal]);

    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="container mx-auto px-4 py-8 min-h-screen flex flex-col"
        >
            <Dialog open={!!selectedDeck} onOpenChange={(open) => !open && setSelectedDeck(null)}>
                <DialogContent className="bg-transparent border-none p-0 max-w-2xl shadow-none">
                    {selectedDeck && <DeckCard deck={selectedDeck} className="w-full shadow-2xl" />}
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 landscape:mb-2">
                <Link href={`/t/${tournamentId}`} className="flex items-center text-muted-foreground hover:text-foreground transition-colors landscape:text-xs">
                    <ArrowLeft className="w-4 h-4 mr-2 landscape:w-3 landscape:h-3" /> <span className="landscape:hidden">Back to </span>Dashboard
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
            <div className="flex items-center gap-4 mb-8 landscape:mb-2">
                <h1 className="text-3xl font-bold landscape:text-xl">
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
                {/* Projector Link (Visible to everyone or just owners? Let's make it visible to owners/judges for now, or everyone?) */}
                {(isOwner || isJudge) && (
                    <Link href={`/t/${tournamentId}/projector`} target="_blank" className="ml-2 flex items-center gap-2 text-xs font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 bg-cyan-500/5 px-3 py-1 rounded-full transition-all landscape:hidden">
                        <Loader2 className="w-3 h-3" /> Projector
                    </Link>
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
                        <p className="text-sm">The tournament has not started.</p>
                    </div>
                ) : viewMode === "swiss" ? (
                    <>
                        <div className="mb-8 overflow-x-auto">
                            <BracketConnector matches={swissMatches} match_target_points={tournament?.match_target_points ?? 4} />
                        </div>
                        <SwissView
                            matches={swissMatches}
                            participants={participants}
                            onMatchClick={(m) => canEdit && setSelectedMatchId(m.id)}
                            onDeckClick={(d) => setSelectedDeck(d)}
                            totalSwissRounds={tournament?.swiss_rounds ?? 5}
                        />
                    </>
                ) : (
                    <TopCutView
                        matches={topCutMatches}
                        participants={participants}
                        cutSize={tournament?.cut_size ?? 0}
                        onMatchClick={(m) => canEdit && setSelectedMatchId(m.id)}
                        onDeckClick={(d) => setSelectedDeck(d)}
                    />
                )}
            </div>

            {/* Modals */}
            <MatchScoringModal
                isOpen={!!selectedMatch}
                match={selectedMatch}
                participants={participants}
                onClose={() => { refresh(); setSelectedMatchId(null); }}
                refresh={refresh}
                ruleset={tournament?.ruleset_config}
                cutSize={tournament?.cut_size}
                currentlyStreamingMatchId={currentlyStreamingMatch?.id}
            />
            <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title || ""} description={confirmState.description || ""} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} onConfirm={executeConfirmation} isLoading={advancing} confirmText={confirmState.type === 'proceed' ? "Proceed" : "Start Round"} />
            <VictoryModal isOpen={showVictoryModal} onClose={() => setShowVictoryModal(false)} winner={winner} runnerUp={runnerUp} thirdPlace={thirdPlace} swissKing={swissKing} tournamentName={tournament?.name ?? ""} organizerName={tournament?.stores?.name || "Official Result"} />
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

function SwissView({
    matches,
    participants,
    onMatchClick,
    onDeckClick,
    totalSwissRounds = 5
}: {
    matches: Match[],
    participants: Record<string, Participant>,
    onMatchClick: (m: Match) => void,
    onDeckClick: (deck: any) => void,
    totalSwissRounds?: number
}) {
    const rounds: Record<number, Match[]> = {};
    matches.forEach(m => {
        if (!rounds[m.swiss_round_number]) rounds[m.swiss_round_number] = [];
        rounds[m.swiss_round_number].push(m);
    });
    const roundsList = Object.keys(rounds).sort((a, b) => Number(a) - Number(b));
    const maxRound = roundsList.length > 0 ? roundsList[roundsList.length - 1] : 0;

    // Calculate win counts for each player (across all completed rounds before the last)
    const winCounts: Record<string, number> = {};
    matches.forEach(m => {
        if (m.status === 'complete' && m.winner_id && Number(m.swiss_round_number) < Number(maxRound)) {
            winCounts[m.winner_id] = (winCounts[m.winner_id] || 0) + 1;
        }
    });
    const maxWins = Object.values(winCounts).length > 0 ? Math.max(...Object.values(winCounts)) : 0;

    // A match is a "Swiss King Battle" if:
    // 1. It is the FINAL round of the Swiss stage (usually Round 5)
    // 2. Both players have the top win count going into this round
    const isSwissKingMatch = (m: Match, rNum: number): boolean => {
        if (rNum !== totalSwissRounds) return false;
        if (rNum < 2) return false;

        const winsA = m.participant_a_id ? (winCounts[m.participant_a_id] || 0) : 0;
        const winsB = m.participant_b_id ? (winCounts[m.participant_b_id] || 0) : 0;
        return winsA === maxWins && winsB === maxWins && maxWins > 0;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 pb-12">
            {/* Left: Horizontal Scrollable Matches */}
            <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40">
                <div className="flex flex-row gap-4 min-w-max pr-4">
                    {roundsList.map(rNumStr => {
                        const rNum = Number(rNumStr);
                        return (
                            <div key={rNum} className="flex flex-col gap-2 min-w-[160px] max-w-[180px]">
                                <div className="text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px] border-b border-white/5 pb-1">Round {rNum}</div>
                                <div className="flex flex-col gap-1.5">
                                    {(rounds[rNum] || []).map((m) => (
                                        <MatchCard
                                            key={m.id}
                                            match={m}
                                            participants={participants}
                                            onClick={() => onMatchClick(m)}
                                            onDeckClick={onDeckClick}
                                            isSwissKing={isSwissKingMatch(m, rNum)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Live Standings Sidebar */}
            <div className="w-full lg:w-[300px] shrink-0 space-y-4">
                <div className="rounded-xl border border-white/5 overflow-hidden bg-slate-900/40 shadow-xl backdrop-blur-md">
                    <LiveStandings participants={participants} matches={matches} />
                </div>
            </div>
        </div>
    );
}

function TopCutView({ matches, participants, onMatchClick, onDeckClick, cutSize }: { matches: Match[], participants: Record<string, Participant>, onMatchClick: (m: Match) => void, onDeckClick: (d: any) => void, cutSize: number }) {
    // Import the library dynamically to avoid SSR issues
    const [LibraryComponents, setLibraryComponents] = useState<any>(null);

    useEffect(() => {
        import('react-tournament-brackets').then(mod => {
            setLibraryComponents(mod);
        });
    }, []);

    // Calculate total expected rounds based on cutSize
    // cutSize = 4 -> 2 rounds (Semis, Finals)
    // cutSize = 8 -> 3 rounds (Quarters, Semis, Finals)
    // cutSize = 16 -> 4 rounds (Ro16, Quarters, Semis, Finals)
    const totalRounds = useMemo(() => {
        const size = cutSize || 4;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(size)));
        return Math.log2(bracketSize);
    }, [cutSize]);

    // Transform our match data to the library's format
    const transformedMatches = useMemo(() => {
        if (!cutSize || !matches) return [];

        // 1. Map real matches for easy lookup
        const realMatchMap = new Map<string, Match>();
        matches.forEach(m => {
            realMatchMap.set(`${m.bracket_round}-${m.match_number}`, m);
        });

        // 2. Generate all expected slots based on cutSize
        // We need a connected graph, so we must generate placeholders for future rounds
        const allSlots = [];
        const slotMap = new Map<string, string>(); // map "round-match" -> id

        const bracketSize = Math.pow(2, totalRounds);
        for (let r = 1; r <= totalRounds; r++) {
            const matchCount = bracketSize / Math.pow(2, r);
            for (let m = 1; m <= matchCount; m++) {
                const key = `${r}-${m}`;
                const realMatch = realMatchMap.get(key);
                const id = realMatch ? realMatch.id : `ghost-${key}`;
                allSlots.push({ key, round: r, matchNum: m, realMatch, id });
                slotMap.set(key, id);
            }
        }

        // 3. Round Naming Helper
        const getRoundName = (round: number) => {
            if (round === totalRounds) return 'Finals';
            if (round === totalRounds - 1) return 'Semifinals';
            if (round === totalRounds - 2) return 'Quarterfinals';
            // NOTE: The library usually prefixes with 'Round' if it's not a special string, 
            // but our current setup seems to double it if we include 'Round' here.
            return `${round}`;
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

            return {
                id: id,
                name: `M${matchNum}`,
                nextMatchId: nextMatchId,
                tournamentRoundText: getRoundName(round),
                startTime: null,
                state: realMatch?.status === 'complete' ? 'DONE' : 'SCHEDULED',
                participants: [
                    {
                        id: realMatch?.participant_a_id || `tbd-a-${id}`,
                        resultText: realMatch?.score_a?.toString() ?? '-',
                        isWinner: realMatch?.winner_id === realMatch?.participant_a_id && realMatch?.status === 'complete',
                        status: realMatch?.status === 'complete' ? 'PLAYED' : null,
                        name: pA?.display_name || (realMatch ? 'BYE' : 'TBD'),
                        deck: pA?.deck
                    },
                    {
                        id: realMatch?.participant_b_id || `tbd-b-${id}`,
                        resultText: realMatch?.score_b?.toString() ?? '-',
                        isWinner: realMatch?.winner_id === realMatch?.participant_b_id && realMatch?.status === 'complete',
                        status: realMatch?.status === 'complete' ? 'PLAYED' : null,
                        name: pB?.display_name || (realMatch ? 'BYE' : 'TBD'),
                        deck: pB?.deck
                    }
                ]
            };
        });
    }, [matches, participants, cutSize, totalRounds]);

    // Find 3rd place match
    const thirdPlaceMatch = useMemo(() => {
        if (!matches.length) return null;
        return matches.find(m => Number(m.bracket_round) === totalRounds && m.match_number === 2) || null;
    }, [matches, totalRounds]);

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
    }: any) => {
        // Check if this match is being actively scored by a judge
        const originalMatch = matchById[match.id];
        const isScoringActive = originalMatch && originalMatch.status !== 'complete' && originalMatch.metadata?.scoring_active;

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    background: '#0F172A',
                    borderRadius: '8px',
                    border: isScoringActive ? '2px solid #22D3EE' : '1px solid #334155',
                    boxShadow: isScoringActive ? '0 0 12px rgba(34, 211, 238, 0.35)' : 'none',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    animation: isScoringActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
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
                        padding: '2px 8px',
                        background: topWon ? '#22D3EE' : topHovered ? '#1E293B' : 'transparent',
                        borderBottom: '1px solid #334155',
                        transition: 'background 0.2s',
                    }}
                >
                    <span style={{
                        color: topWon ? '#000000' : '#E2E8F0',
                        fontSize: '10px',
                        fontWeight: topWon ? '900' : 'bold',
                        paddingRight: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                    }}>
                        {(() => {
                            const p = participants[topParty.id];
                            const profile: any = p?.profiles;
                            return (Array.isArray(profile) ? profile[0] : profile)?.display_name || topParty.name || teamNameFallback;
                        })()}
                    </span>
                    <span style={{
                        color: topWon ? '#000000' : '#94A3B8',
                        fontSize: '10px',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        minWidth: '16px',
                        textAlign: 'right',
                        opacity: topWon ? 1 : 0.8,
                    }}>
                        {topParty.resultText || '-'}
                    </span>
                    {topParty.deck && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDeckClick(topParty.deck); }}
                            className={cn(
                                "ml-1 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer",
                                topWon ? "text-slate-950" : "text-cyan-500"
                            )}
                            title={`View Deck: ${topParty.deck.name}`}
                        >
                            <Eye className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                    )}
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
                        padding: '2px 8px',
                        background: bottomWon ? '#22D3EE' : bottomHovered ? '#1E293B' : 'transparent',
                        transition: 'background 0.2s',
                    }}
                >
                    <span style={{
                        color: bottomWon ? '#000000' : '#E2E8F0',
                        fontSize: '10px',
                        fontWeight: bottomWon ? '900' : 'bold',
                        paddingRight: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                    }}>
                        {(() => {
                            const p = participants[bottomParty.id];
                            const profile: any = p?.profiles;
                            return (Array.isArray(profile) ? profile[0] : profile)?.display_name || bottomParty.name || teamNameFallback;
                        })()}
                    </span>
                    <span style={{
                        color: bottomWon ? '#000000' : '#94A3B8',
                        fontSize: '10px',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        minWidth: '16px',
                        textAlign: 'right',
                        opacity: bottomWon ? 1 : 0.8,
                    }}>
                        {bottomParty.resultText || '-'}
                    </span>
                    {bottomParty.deck && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDeckClick(bottomParty.deck); }}
                            className={cn(
                                "ml-1 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer",
                                bottomWon ? "text-slate-950" : "text-cyan-500"
                            )}
                            title={`View Deck: ${bottomParty.deck.name}`}
                        >
                            <Eye className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                                width: 140,
                                boxHeight: 48,
                                spaceBetweenColumns: 40,
                                spaceBetweenRows: 12,
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
    onDeckClick?: (deck: any) => void;
    label?: string | null;
    isSwissKing?: boolean;
    nextMatchNumber?: number | null;
    isHighlighted?: boolean;
    isSource?: boolean;
    isTarget?: boolean;
}

function MatchCard({ match, participants, onClick, onDeckClick, isSwissKing, isHighlighted }: MatchCardProps) {
    const pA = match.participant_a_id ? participants[match.participant_a_id] : null;
    const pB = match.participant_b_id ? participants[match.participant_b_id] : null;
    const isCompleted = match.status === "complete";
    const winnerId = match.winner_id;
    const aWon = isCompleted && winnerId === match.participant_a_id;
    const bWon = isCompleted && winnerId === match.participant_b_id;
    const isScoringActive = !isCompleted && match.metadata?.scoring_active;

    const isPending = !isCompleted && !isScoringActive && match.participant_a_id && match.participant_b_id;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex flex-col w-full rounded-md border overflow-hidden cursor-pointer transition-all duration-200 shadow-lg",
                isSwissKing ? "border-yellow-500/50 shadow-yellow-500/10" : "border-slate-800",
                isHighlighted ? "border-cyan-500 ring-1 ring-cyan-500/20 scale-[1.02]" : "hover:border-slate-700",
                isPending && !isHighlighted && "border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-950/20",
                isScoringActive && "border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse bg-cyan-950/20"
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
                "grid grid-cols-[1fr_22px_22px] min-h-[24px] items-center px-1.5 py-0.5 transition-colors",
                aWon ? "bg-cyan-400" : "bg-transparent",
                !aWon && "border-b border-slate-800"
            )}>
                <span className={cn(
                    "text-[10px] uppercase font-black tracking-tighter truncate",
                    aWon ? "text-slate-950" : "text-slate-100"
                )}>
                    {(() => {
                        const profile: any = pA?.profiles;
                        return (Array.isArray(profile) ? profile[0] : profile)?.display_name || pA?.display_name || "BYE";
                    })()}
                </span>
                <span className={cn(
                    "text-xs font-black font-mono text-center",
                    aWon ? "text-slate-950" : "text-cyan-400"
                )}>
                    {match.score_a ?? "-"}
                </span>
                <div className="flex justify-center">
                    {pA?.deck && onDeckClick && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDeckClick(pA.deck); }}
                            className={cn(
                                "w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer z-10",
                                aWon ? "text-slate-950" : "text-cyan-500"
                            )}
                            title={`View Deck: ${pA.deck.name}`}
                        >
                            <Eye className="w-2 h-2 stroke-[3]" />
                        </div>
                    )}
                </div>
            </div>

            {/* Participant B */}
            <div className={cn(
                "grid grid-cols-[1fr_22px_22px] min-h-[24px] items-center px-1.5 py-0.5 transition-colors",
                bWon ? "bg-cyan-400" : "bg-transparent"
            )}>
                <span className={cn(
                    "text-[10px] uppercase font-black tracking-tighter truncate",
                    bWon ? "text-slate-950" : "text-slate-100"
                )}>
                    {(() => {
                        const profile: any = pB?.profiles;
                        return (Array.isArray(profile) ? profile[0] : profile)?.display_name || pB?.display_name || "BYE";
                    })()}
                </span>
                <span className={cn(
                    "text-xs font-black font-mono text-center",
                    bWon ? "text-slate-950" : "text-cyan-400"
                )}>
                    {match.score_b ?? "-"}
                </span>
                <div className="flex justify-center">
                    {pB?.deck && onDeckClick && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDeckClick(pB.deck); }}
                            className={cn(
                                "w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer z-10",
                                bWon ? "text-slate-950" : "text-cyan-500"
                            )}
                            title={`View Deck: ${pB.deck.name}`}
                        >
                            <Eye className="w-2 h-2 stroke-[3]" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
