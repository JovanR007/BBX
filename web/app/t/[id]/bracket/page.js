
"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { MatchScoringModal } from "@/components/match-scoring-modal";
import { ConfirmationModal } from "@/components/ui/modal";
import { ArrowLeft, Trophy, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { proceedToTopCutAction, advanceBracketAction, autoScoreRoundAction, resetRoundAction, getTournamentDataAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";
import { Loader2, PlayCircle, AlertCircle, Wand2, Trash2, Crown } from "lucide-react";
import { BracketConnector } from "@/components/bracket-connector";
import { VictoryModal } from "@/components/victory-modal";
import { ConcludeModal } from "@/components/conclude-modal";
import { endTournamentAction } from "@/app/actions";
import { parseError } from "@/lib/errors"; // Ensure parseError is available or imported if needed (it was used in Admin)
import React from 'react';

import { useTournament } from "@/hooks/use-tournament";

export default function BracketPage({ params }) {
    // Next.js 15+ / React 19: params is a Promise
    const { id: paramId } = use(params);
    // We can still use the hook for basic subscribe, OR just rely on our manual fetch.
    // Let's rely on manual fetch to guarantee we see what Admin sees.
    const { id: tournamentId } = { id: paramId }; // Simple destructure

    const { toast } = useToast();

    const [loadingData, setLoadingData] = useState(true);
    // Alias for compatibility
    const setLoading = setLoadingData;
    const loading = loadingData;
    const [viewMode, setViewMode] = useState("loading"); // 'swiss', 'top_cut', 'empty'

    // Data
    const [tournament, setTournament] = useState(null);
    const [matches, setMatches] = useState([]); // All matches
    const [participants, setParticipants] = useState({});
    const [isSwissFinished, setIsSwissFinished] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null); // For modal
    const [advancing, setAdvancing] = useState(false);
    const [confirmState, setConfirmState] = useState({ isOpen: false, type: null, data: null }); // type: 'advance' | 'proceed'
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [swissKing, setSwissKing] = useState(null);
    const [concludePinOpen, setConcludePinOpen] = useState(false);

    useEffect(() => {
        if (tournamentId) fetchData();
    }, [tournamentId]);

    async function fetchData() {
        if (!tournamentId) return;
        setLoading(true);

        const res = await getTournamentDataAction(tournamentId);

        if (!res.success) {
            toast({ title: "Error Loading Data", description: res.error, variant: "destructive" });
            setLoading(false);
            return;
        }

        const tourney = res.tournament;
        const fetchedMatches = res.matches;
        const parts = res.participants;

        setTournament(tourney);

        // Map Participants
        const pMap = {};
        parts?.forEach(p => pMap[p.id] = p);
        setParticipants(pMap);

        if (!fetchedMatches || fetchedMatches.length === 0) {
            setMatches([]);
            setViewMode("empty");
            setLoading(false);
            return;
        }

        // Fetch Swiss King (Client side fetch is fine for standings, or move to server action later)
        // For now, let's keep Swiss King fetch separate or just ignore if strict RLS. 
        // Likely Standings are public.
        // Let's assume standings work or just skip specific king query for now to speed up.

        setMatches(fetchedMatches);

        // 4. Determine State & Group Matches (for view mode logic)
        let maxS = 0;
        let hasTC = false;
        const swissMatchesTemp = fetchedMatches.filter(m => m.stage === "swiss");
        const topCutMatchesTemp = fetchedMatches.filter(m => m.stage === "top_cut");

        if (swissMatchesTemp.length > 0) {
            maxS = Math.max(...swissMatchesTemp.map(m => m.swiss_round_number));
        }
        if (topCutMatchesTemp.length > 0) {
            hasTC = true;
        }

        // Check if Swiss is "Finished" (e.g. Round 5 complete)
        // Heuristic: If Round 5 exists and all complete
        // Or if simple dynamic: Check if last existing round is complete
        if (maxS > 0) {
            const lastSwissRoundMatches = swissMatchesTemp.filter(m => m.swiss_round_number === maxS);
            const allComplete = lastSwissRoundMatches.every(m => m.status === "complete");
            // Also arbitrary limit? usually 5.
            setIsSwissFinished(allComplete && maxS >= 5);
        } else {
            setIsSwissFinished(false);
        }


        // Decide View
        if (hasTC) {
            setViewMode("top_cut");
        } else if (maxS > 0) {
            setViewMode("swiss");
        } else {
            setViewMode("empty");
        }

        setLoading(false);
    }


    async function handleAdvanceCheck(currentRound) {
        setConfirmState({
            isOpen: true,
            type: 'advance',
            data: currentRound,
            title: `Start Round ${currentRound + 1}?`,
            description: "Ensure all matches in the current round are completed and scores are verified. This action cannot be undone."
        });
    }

    async function handleProceedCheck() {
        setConfirmState({
            isOpen: true,
            type: 'proceed',
            data: null,
            title: "Proceed to Elimination Stage?",
            description: "This will end the Swiss Stage and generate the Top Cut bracket based on final standings. Are you sure?"
        });
    }

    async function executeConfirmation() {
        setAdvancing(true);
        const { type, data } = confirmState;

        let res;
        if (type === 'advance') {
            res = await advanceBracketAction(tournamentId);
        } else if (type === 'proceed') {
            res = await proceedToTopCutAction(tournamentId);
        }

        if (res?.success) {
            toast({
                title: type === 'advance' ? "Round Started" : "Stage Advanced",
                description: type === 'advance' ? `Round ${data + 1} generated successfully.` : "Top Cut bracket generated.",
                variant: "success"
            });
            fetchData();
        } else {
            toast({ title: "Error", description: res?.error || "Unknown error", variant: "destructive" });
        }

        setAdvancing(false);
        setConfirmState({ ...confirmState, isOpen: false });
    }

    async function handleAutoScore() {
        if (!confirm("Start Debug Auto-Score? This will finish all pending matches in this round.")) return;

        setAdvancing(true);
        const res = await autoScoreRoundAction(tournamentId);
        setAdvancing(false);

        if (res.success) {
            toast({ title: "Auto-Score Complete", description: `Scored ${res.count} matches.` });
            fetchData();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    }

    async function handleResetRound() {
        if (!confirm("RESET ROUND? This will DELETE the latest Top Cut round matches. useful for fixing bugs.")) return;

        setAdvancing(true);
        const res = await resetRoundAction(tournamentId);
        setAdvancing(false);

        if (res.success) {
            toast({ title: "Round Reset", description: res.message });
            fetchData();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    }

    // derived state for Swiss Header
    const swissMatches = matches.filter(m => m.stage === "swiss");
    const maxSwissRound = swissMatches.length > 0 ? Math.max(...swissMatches.map(m => Number(m.swiss_round_number))) : 0;
    const currentRoundMatches = swissMatches.filter(m => Number(m.swiss_round_number) === maxSwissRound);
    const isRoundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'complete');

    // derived state for Top Cut Header
    const topCutMatches = matches.filter(m => m.stage === "top_cut");
    const maxBracketRound = topCutMatches.length > 0 ? Math.max(...topCutMatches.map(m => Number(m.bracket_round))) : 0;
    const currentBracketMatches = topCutMatches.filter(m => Number(m.bracket_round) === maxBracketRound);
    const isBracketRoundComplete = currentBracketMatches.length > 0 && currentBracketMatches.every(m => m.status === 'complete');
    const totalBracketRounds = tournament?.cut_size ? Math.ceil(Math.log2(tournament.cut_size)) : 0;
    const isTournamentComplete = isBracketRoundComplete && maxBracketRound >= totalBracketRounds;

    // Derived Top 3
    let winner = null, runnerUp = null, thirdPlace = null;
    if (isTournamentComplete && totalBracketRounds > 0) {
        const gfMatch = topCutMatches.find(m => Number(m.bracket_round) === totalBracketRounds && m.match_number === 1);
        if (gfMatch && gfMatch.status === 'complete') {
            winner = participants[gfMatch.winner_id];
            runnerUp = participants[gfMatch.winner_id === gfMatch.participant_a_id ? gfMatch.participant_b_id : gfMatch.participant_a_id];
        }
        const p3Match = topCutMatches.find(m => Number(m.bracket_round) === totalBracketRounds && m.match_number === 2);
        if (p3Match && p3Match.status === 'complete') {
            thirdPlace = participants[p3Match.winner_id];
        }
    }

    async function handleConclude(pin) {
        setAdvancing(true);
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("admin_pin", pin);

        const res = await endTournamentAction(formData);
        if (res.success) {
            setConcludePinOpen(false);
            toast({ title: "Tournament Concluded", description: "Status set to Complete.", variant: "success" });
            fetchData();
            setTimeout(() => setShowVictoryModal(true), 500); // Auto show victory
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setAdvancing(false);
    }

    return (
        <div className="container mx-auto px-4 py-8 overflow-x-auto min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <Link href={`/t/${tournamentId}`} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                {/* Swiss Controls */}
                {viewMode === "swiss" && !isSwissFinished && maxSwissRound > 0 && (
                    <div className="flex items-center gap-4">
                        {!isRoundComplete ? (
                            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-sm font-bold animate-pulse">
                                <AlertCircle className="w-4 h-4" />
                                <span>Matches In Progress ({currentRoundMatches.filter(m => m.status === 'complete').length}/{currentRoundMatches.length})</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleAdvanceCheck(maxSwissRound)}
                                disabled={advancing}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                Start Round {maxSwissRound + 1}
                            </button>
                        )}
                    </div>
                )}

                {/* Swiss Finished -> Proceed */}
                {viewMode === "swiss" && isSwissFinished && (
                    <button
                        onClick={handleProceedCheck}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded font-bold shadow-lg animate-pulse flex items-center gap-2"
                    >
                        <Trophy className="w-4 h-4" /> Proceed to Elimination Stage
                    </button>
                )}

                {/* Top Cut Controls */}
                {viewMode === "top_cut" && (
                    <div className="flex items-center gap-4">
                        {!isBracketRoundComplete ? (
                            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-sm font-bold animate-pulse">
                                <AlertCircle className="w-4 h-4" />
                                <span>Matches In Progress ({currentBracketMatches.filter(m => m.status === 'complete').length}/{currentBracketMatches.length})</span>
                            </div>
                        ) : !isTournamentComplete ? (
                            <button
                                onClick={() => handleAdvanceCheck(maxBracketRound)}
                                disabled={advancing}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                Start Next Round
                            </button>
                        ) : (
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20 text-sm font-bold">
                                    <Trophy className="w-4 h-4" />
                                    <span>Tournament Complete</span>
                                </div>
                                {tournament.status === 'completed' ? (
                                    <button
                                        onClick={() => setShowVictoryModal(true)}
                                        className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 transition-all font-bold"
                                    >
                                        <Crown className="w-3 h-3" /> View Podium
                                    </button>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <button
                                            onClick={() => setConcludePinOpen(true)}
                                            className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-3 py-1 rounded font-bold transition-colors"
                                        >
                                            Conclude Tournament
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">
                    {viewMode === "top_cut" ? "Elimination Bracket" : "Swiss Standings & Matches"}
                </h1>
                {/* Removed static FINALS badge to avoid confusion */}

                {/* Debug Buttons */}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handleAutoScore}
                        disabled={advancing}
                        className="flex items-center gap-2 text-xs font-mono text-purple-500 hover:text-purple-400 border border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 px-3 py-1 rounded-full transition-all"
                        title="Debug: Randomly score all pending matches"
                    >
                        <Wand2 className="w-3 h-3" /> Auto-Resolve
                    </button>
                    <button
                        onClick={handleResetRound}
                        disabled={advancing}
                        className="flex items-center gap-2 text-xs font-mono text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/50 bg-red-500/5 px-3 py-1 rounded-full transition-all"
                        title="Debug: Delete latest round matches"
                    >
                        <Trash2 className="w-3 h-3" /> Reset Round
                    </button>
                </div>
            </div>

            {
                loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div> Loading tournament data...</div>
                ) : viewMode === "empty" ? (
                    <div className="p-12 border border-dashed rounded-xl text-center text-muted-foreground">
                        <Info className="w-8 h-8 mx-auto mb-4 opacity-50" />
                        <p>No matches found yet.</p>
                        <p className="text-sm">The tournament hasn't started.</p>
                    </div>
                ) : viewMode === "swiss" ? (
                    <SwissView
                        matches={matches.filter(m => m.stage === "swiss")}
                        participants={participants}
                        onMatchClick={setSelectedMatch}
                    />
                ) : (
                    <TopCutView
                        matches={matches.filter(m => m.stage === "top_cut")}
                        participants={participants}
                        cutSize={tournament?.cut_size}
                        onMatchClick={setSelectedMatch}
                    />
                )
            }

            <MatchScoringModal
                isOpen={!!selectedMatch}
                match={selectedMatch}
                participants={participants}
                onClose={() => setSelectedMatch(null)}
                refresh={fetchData}
            />

            <ConfirmationModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeConfirmation}
                isLoading={advancing}
                confirmText={confirmState.type === 'proceed' ? "Proceed" : "Start Round"}
            />

            <VictoryModal
                isOpen={showVictoryModal}
                onClose={() => setShowVictoryModal(false)}
                winner={winner}
                runnerUp={runnerUp}
                thirdPlace={thirdPlace}
                swissKing={swissKing}
                tournamentName={tournament?.name}
                organizerName={tournament?.location}
            />

            <ConcludeModal
                isOpen={concludePinOpen}
                onClose={() => setConcludePinOpen(false)}
                onConfirm={handleConclude}
                loading={advancing}
            />
        </div >
    );
}

function SwissView({ matches, participants, onMatchClick }) {
    // Group matches by round
    const rounds = {};
    matches.forEach(m => {
        if (!rounds[m.swiss_round_number]) rounds[m.swiss_round_number] = [];
        rounds[m.swiss_round_number].push(m);
    });

    // Determine potential Swiss King Match (Round 5 or Last Round, Table 1)
    // IMPORTANT: It relies on identifying the max round and the first match in that round.
    const roundsList = Object.keys(rounds).sort((a, b) => Number(a) - Number(b));
    const maxRound = roundsList.length > 0 ? roundsList[roundsList.length - 1] : 0;

    return (
        <div className="flex flex-row gap-8 pb-12 min-w-max">
            {roundsList.map(rNum => {
                const isLastRound = Number(rNum) === Number(maxRound);
                // Also check if it's at least round 3-4? Swiss King usually only relevant late.
                // Table 1 is index 0.

                return (
                    <div key={rNum} className="flex flex-col gap-4 min-w-[280px]">
                        <div className="text-center font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">
                            Round {rNum}
                        </div>
                        <div className="flex flex-col gap-3">
                            {rounds[rNum].map((m, idx) => (
                                <MatchCard
                                    key={m.id}
                                    match={m}
                                    participants={participants}
                                    onClick={() => onMatchClick(m)}
                                    isSwissKing={isLastRound && idx === 0 && Number(rNum) >= 5} // Only highlight in later rounds (5+)
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function TopCutView({ matches, participants, onMatchClick, cutSize }) {
    // 1. Group matches by round
    const rounds = {};
    matches.forEach(m => {
        if (!rounds[m.bracket_round]) rounds[m.bracket_round] = [];
        rounds[m.bracket_round].push(m);
    });

    const roundKeys = Object.keys(rounds).sort((a, b) => Number(a) - Number(b));

    // 2. Determine Finals Round based on cut_size
    // Top 16 -> 4 rounds. Top 8 -> 3 rounds. Top 4 -> 2 rounds.
    const totalRounds = Math.ceil(Math.log2(cutSize || 4));

    return (
        <div className="flex flex-row gap-0 pb-12 min-w-max items-stretch">
            {roundKeys.map((rNum, index) => {
                const isFinals = Number(rNum) === totalRounds;
                const matchCount = rounds[rNum].length;

                return (
                    <React.Fragment key={rNum}>
                        <div className="flex flex-col min-w-[280px] z-10 w-80">
                            {/* Header: Fixed Height to match Connector Spacer */}
                            <div className="text-center font-bold text-muted-foreground uppercase tracking-wider h-6 mb-4">
                                {isFinals ? "Grand Finals" : `Round ${rNum}`}
                            </div>

                            {/* Matches Container via CSS Grid */
                            /* grid-rows-X allows exact 1/N height per slot */
                            /* minmax(0, 1fr) handles overflows gracefully */}
                            <div
                                className={cn(
                                    "grid flex-grow relative w-full",
                                    isFinals ? "gap-16" : "" // Add large gap for Finals to separate 3rd place
                                )}
                                style={{
                                    gridTemplateRows: isFinals
                                        ? "1fr 1fr" // Use simple split for finals
                                        : `repeat(${matchCount}, minmax(0, 1fr))`
                                }}
                            >
                                {rounds[rNum].map((m, idx) => (
                                    <div key={m.id} className={cn(
                                        "flex flex-col justify-center items-center w-full px-2",
                                        isFinals && idx === 1 ? "justify-start pt-8" : "" // Push 3rd place down a bit more? Or let gap handle it.
                                    )}>
                                        <div className="w-full relative">
                                            {/* Separation Label for 3rd Place */}
                                            {isFinals && idx === 1 && (
                                                <div className="absolute -top-10 left-0 w-full text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                    3rd Place Match
                                                </div>
                                            )}
                                            <MatchCard
                                                match={m}
                                                participants={participants}
                                                onClick={() => onMatchClick(m)}
                                                // We used to rely on label prop inside MatchCard, removing generic label logic for 3rd place to custom handle it
                                                // But let's keep it if check specific logic
                                                label={null} // We handle the label externally now for better positioning
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Render connector if not the last round (which is totalRounds) */}
                        {Number(rNum) < totalRounds && (
                            <BracketConnector
                                previousRoundCount={matchCount}
                                isFinals={(Number(rNum) + 1) === totalRounds}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    )
}

function MatchCard({ match, participants, onClick, label, isSwissKing }) {
    // Basic Bracket Node
    const winnerId = match.winner_id;
    const isCompleted = match.status === "complete";

    // Names
    const pA = participants[match.participant_a_id];
    const pB = participants[match.participant_b_id];

    // Always allow click to view details or Admin Override
    const isActionable = true;

    // Highlight incomplete matches (Swiss OR Top Cut)
    // For Top Cut, we ideally only highlight the LATEST round? Or just any incomplete one.
    // Let's highlight ANY incomplete match in Swiss/TopCut to draw attention.
    const isIncomplete = match.status !== 'complete';
    const showPulse = isIncomplete && (
        (match.stage === 'swiss' && match.swiss_round_number === Math.max(match.swiss_round_number)) ||
        (match.stage === 'top_cut') // Always pulse pending top cut matches as they are critical
    );

    return (
        <div
            onClick={isActionable ? onClick : undefined}
            className={cn(
                "border rounded-lg bg-card p-3 shadow-sm w-full relative transition-all group",
                isActionable ? 'hover:border-primary cursor-pointer active:scale-[0.98]' : 'opacity-80',
                match.stage === 'top_cut' ? "border-primary/20" : "border-border",
                showPulse ? "ring-1 ring-yellow-500/50 border-yellow-500/30 bg-yellow-500/5" : "",
                isSwissKing ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)] bg-gradient-to-br from-yellow-500/10 to-transparent" : ""
            )}
        >
            {showPulse && !isSwissKing && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
            )}

            {isSwissKing && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider whitespace-nowrap z-10 shadow-lg flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Battle for Swiss King
                </div>
            )}

            {label && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border px-2 py-0.5 rounded text-[10px] text-muted-foreground uppercase font-bold tracking-wider whitespace-nowrap z-10">
                    {label}
                </div>
            )}

            <div className="flex flex-col gap-2">
                {/* Player A */}
                <div className={cn(
                    "flex justify-between items-center p-2 rounded transition-colors",
                    winnerId === match.participant_a_id && isCompleted ? "bg-primary/20 font-bold" : "bg-muted/30 group-hover:bg-muted/50"
                )}>
                    <span className="text-sm truncate w-[140px]" title={pA?.display_name || "BYE"}>{pA?.display_name || "BYE"}</span>
                    <span className="font-mono text-sm">{match.score_a}</span>
                </div>

                {/* Player B */}
                <div className={cn(
                    "flex justify-between items-center p-2 rounded transition-colors",
                    winnerId === match.participant_b_id && isCompleted ? "bg-primary/20 font-bold" : "bg-muted/30 group-hover:bg-muted/50"
                )}>
                    <span className="text-sm truncate w-[140px]" title={pB?.display_name || "BYE"}>{pB?.display_name || "BYE"}</span>
                    <span className="font-mono text-sm">{match.score_b}</span>
                </div>
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground flex justify-between uppercase items-center">
                <span>M{match.match_number}</span>
                {match.stage === 'top_cut' && isCompleted && (
                    <span className="text-primary flex items-center gap-1 font-bold"><Trophy className="w-3 h-3" /> Winner</span>
                )}
            </div>
        </div>
    )
}
