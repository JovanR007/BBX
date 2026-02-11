"use client";

import { useEffect, useState, useRef } from "react";
import { X, RefreshCcw, AlertTriangle, Trophy, Undo2, Swords, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { reportMatchAction, forceUpdateMatchScoreAction, syncMatchStateAction, toggleCameraStreamAction } from "@/app/actions/match"; // Updated import
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import { useUser } from "@stackframe/stack";
import dynamic from "next/dynamic";

const CameraStreamer = dynamic(() => import("./camera-streamer").then(mod => mod.CameraStreamer), { ssr: false });

export function MatchScoringModal({ isOpen, onClose, match, participants, refresh, ruleset, cutSize, currentlyStreamingMatchId }: { isOpen: boolean; onClose: () => void; match: any; participants: any; refresh: () => void; ruleset?: any, cutSize?: number, currentlyStreamingMatchId?: string | null }) {
    const { toast } = useToast();
    const user = useUser();

    // --- FINAL MATCH DETECTION ---
    const isFinalsMatch = (() => {
        if (!match) return false;
        if (match.metadata?.type === 'grand_final' || match.metadata?.type === '3rd_place') return true;
        // Fallback: If Top Cut and Last Round
        if (cutSize && match.stage === 'top_cut') {
            const totalRounds = Math.log2(cutSize);
            // match.bracket_round is usually a number, ensure type safety
            if (Number(match.bracket_round) === totalRounds) return true;
        }
        return false;
    })();

    // --- STATE ---
    // Standard / Global Score (or Sets Won)
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);

    // Inputs
    const [beyA, setBeyA] = useState("");
    const [beyB, setBeyB] = useState("");

    // Internal State for Best of 3
    const isBestOf3 = ruleset?.match_type === 'best_of_3';
    const WINNING_SCORE = isBestOf3 ? 2 : (match?.target_points || 4); // Win conditions: 2 Sets OR N Points
    const SET_TARGET = 4; // Hardcoded 4 points for a Set in Best of 3

    const [currentSetScoreA, setCurrentSetScoreA] = useState(0);
    const [currentSetScoreB, setCurrentSetScoreB] = useState(0);

    // Warnings & History
    const [warningsA, setWarningsA] = useState(0);
    const [warningsB, setWarningsB] = useState(0);
    const [lastMove, setLastMove] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Determine Players
    const pA = participants ? participants[match?.participant_a_id] : match?.participant_a;
    const pB = participants ? participants[match?.participant_b_id] : match?.participant_b;
    const isGameOver = scoreA >= WINNING_SCORE || scoreB >= WINNING_SCORE;
    const winner = scoreA >= WINNING_SCORE ? pA : (scoreB >= WINNING_SCORE ? pB : null);

    // Ref-based state to prevent race conditions on rapid clicks
    const scoreARef = useRef(match?.score_a || 0);
    const scoreBRef = useRef(match?.score_b || 0);
    const scoreASetRef = useRef((isBestOf3 && match?.metadata) ? (match.metadata.current_set_score_a || 0) : 0);
    const scoreBSetRef = useRef((isBestOf3 && match?.metadata) ? (match.metadata.current_set_score_b || 0) : 0);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && match && match.id) {
            // Restore from Match Data
            const restoredScoreA = match.score_a || 0;
            const restoredScoreB = match.score_b || 0;
            setScoreA(restoredScoreA);
            setScoreB(restoredScoreB);
            scoreARef.current = restoredScoreA;
            scoreBRef.current = restoredScoreB;

            // Restore Metadata Logic for Best of 3
            const restoredSetA = (isBestOf3 && match.metadata) ? (match.metadata.current_set_score_a || 0) : 0;
            const restoredSetB = (isBestOf3 && match.metadata) ? (match.metadata.current_set_score_b || 0) : 0;
            setCurrentSetScoreA(restoredSetA);
            setCurrentSetScoreB(restoredSetB);
            scoreASetRef.current = restoredSetA;
            scoreBSetRef.current = restoredSetB;

            // Restore Beys
            setBeyA(match.bey_a || "");
            setBeyB(match.bey_b || "");

            setWarningsA(0);
            setWarningsB(0);
            setLastMove(null);

            // Seed history: if match already has scores, push a "zero" baseline
            // so the judge can always undo back to 0-0
            if (match.metadata?.scoring_history && match.metadata.scoring_history.length > 0) {
                // Restore persisted history
                setHistory(match.metadata.scoring_history);
            } else {
                // DO NOT seed 0-0 if no history exists.
                // This prevents "Undoing" to 0-0 when the user just opened the modal to edit a score.
                setHistory([]);
            }

            // Signal that this match is being actively scored (real-time highlight)
            syncMatchStateAction(match.id, restoredScoreA, restoredScoreB, {
                ...(match.metadata || {}),
                scoring_active: true,
            }).catch(console.error);
        }
    }, [isOpen, match?.id]);

    // Cleanup: clear scoring_active when modal unmounts or closes
    useEffect(() => {
        const matchId = match?.id;
        const matchMeta = match?.metadata;

        return () => {
            if (matchId) {
                // BUG FIX: Use current Refs for score, NOT stale match prop
                // This prevents resetting score to 0 on close/unmount
                const finalScoreA = scoreARef.current;
                const finalScoreB = scoreBRef.current;

                syncMatchStateAction(matchId, finalScoreA, finalScoreB, {
                    ...(matchMeta || {}),
                    scoring_active: false,
                }).catch(console.error);
            }
        };
    }, [match?.id]); // Only run on mount/unmount or ID change

    // --- HELPERS ---
    const saveState = () => {
        const newEntry = {
            scoreA, scoreB,
            currentSetScoreA, currentSetScoreB,
            warningsA, warningsB,
            lastMove
        };
        const newHistory = [...history, newEntry];
        setHistory(newHistory);
        return newHistory;
    };

    const syncDB = async (sA: number, sB: number, curA: number, curB: number, updatedHistory?: any[]) => {
        // Syncs global score AND internal set score, preserving existing metadata
        const existingMeta = match?.metadata || {};
        const newMeta = {
            ...existingMeta,
            ...(isBestOf3 ? { current_set_score_a: curA, current_set_score_b: curB } : {}),
            scoring_history: updatedHistory ?? history,
            scoring_active: true, // Keep highlight active while modal is open
        };

        syncMatchStateAction(match.id, sA, sB, newMeta).catch(console.error);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setScoreA(prev.scoreA);
        setScoreB(prev.scoreB);
        setCurrentSetScoreA(prev.currentSetScoreA);
        setCurrentSetScoreB(prev.currentSetScoreB);

        // Sync Refs
        scoreARef.current = prev.scoreA;
        scoreBRef.current = prev.scoreB;
        scoreASetRef.current = prev.currentSetScoreA;
        scoreBSetRef.current = prev.currentSetScoreB;
        setWarningsA(prev.warningsA);
        setWarningsB(prev.warningsB);
        setLastMove(prev.lastMove);
        setHistory(newHistory);

        syncDB(prev.scoreA, prev.scoreB, prev.currentSetScoreA, prev.currentSetScoreB, newHistory);
        toast({ title: "Undone", description: "Reverted last action." });
    };

    // --- SCORING LOGIC ---
    const handleScore = (player: string, pts: number, type: string) => {
        if (isGameOver) return;

        // Save current state before modification
        const newHistory = saveState();

        let sA = scoreARef.current;
        let sB = scoreBRef.current;
        let cA = scoreASetRef.current;
        let cB = scoreBSetRef.current;

        // Update Logic depending on Mode
        if (player === 'A') {
            if (isBestOf3) {
                cA += pts;
                // Check Set Win
                if (cA >= SET_TARGET) {
                    sA += 1; // Win Set
                    // Reset Set Score (but maybe keep for display momentarily? Handling via UI notification)
                    cA = 0;
                    cB = 0;
                    toast({
                        title: "Set 1 Complete!",
                        description: `${pA?.display_name || 'P1'} wins the set! Loser picks next launch.`,
                        duration: 5000
                    });
                }
            } else {
                sA = Math.min(sA + pts, 99);
            }
            setLastMove({ player: 'A', type });
        } else {
            if (isBestOf3) {
                cB += pts;
                if (cB >= SET_TARGET) {
                    sB += 1;
                    cA = 0;
                    cB = 0;
                    toast({
                        title: "Set Complete!",
                        description: `${pB?.display_name || 'P2'} wins the set! Loser picks next launch.`,
                        duration: 5000
                    });
                }
            } else {
                sB = Math.min(sB + pts, 99);
            }
            setLastMove({ player: 'B', type });
        }

        // Apply
        // Apply to Refs
        scoreARef.current = sA;
        scoreBRef.current = sB;
        scoreASetRef.current = cA;
        scoreBSetRef.current = cB;

        // Apply to State (Trigger Render)
        setScoreA(sA);
        setScoreB(sB);
        setCurrentSetScoreA(cA);
        setCurrentSetScoreB(cB);
        setWarningsA(0);
        setWarningsB(0);

        syncDB(sA, sB, cA, cB, newHistory);
    };

    // Warning Logic (Simplified: Adds point to opponent)
    const handleWarning = (player: string) => {
        if (isGameOver) return;
        saveState();

        // Similar logic, just adding 1 point to opponent
        // For simplicity, reusing handleScore logic structure
        // But warnings state tracking needs to happen too

        let wA = warningsA;
        let wB = warningsB;

        if (player === 'A') {
            wA++;
            if (wA >= 2) {
                // Penalty point to B
                handleScore('B', 1, 'penalty');
                wA = 0; // Reset
                toast({ title: "Penalty Applied", description: "2 Warnings -> Point for P2", variant: "destructive" });
            }
        } else {
            wB++;
            if (wB >= 2) {
                handleScore('A', 1, 'penalty');
                wB = 0;
                toast({ title: "Penalty Applied", description: "2 Warnings -> Point for P1", variant: "destructive" });
            }
        }

        setWarningsA(wA);
        setWarningsB(wB);
    };

    // --- SUBMISSION ---
    async function handleSubmit() {
        if (!isGameOver) return;
        setSubmitting(true);

        const form = new FormData();
        form.append("match_id", match.id);
        form.append("score_a", scoreA.toString());
        form.append("score_b", scoreB.toString());
        form.append("target_points", match.target_points?.toString()); // ensure string
        form.append("p_a", match.participant_a_id);
        form.append("p_b", match.participant_b_id);
        form.append("bey_a", beyA);
        form.append("bey_b", beyB);

        // Serialize Metadata for final state
        const metadata = isBestOf3 ? {
            current_set_score_a: currentSetScoreA,
            current_set_score_b: currentSetScoreB,
        } : {};
        form.append("metadata", JSON.stringify(metadata));

        let finishType = lastMove?.type || 'spin';
        form.append("finish_type", finishType);

        const res = await reportMatchAction(form);
        if (res.success) {
            toast({ title: "Match Verified", description: `Winner: ${winner?.display_name || 'TBD'}`, variant: "success" });
            refresh();
            onClose();
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setSubmitting(false);
    }

    if (!isOpen || !match) return null;

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-7xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[90vh]">

                {/* HEADER */}
                <div className="p-3 md:p-4 border-b flex justify-between items-center bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                            {isBestOf3 && <Layers className="w-5 h-5 text-indigo-400" />}
                            {isBestOf3 ? "Best of 3 Sets" : "Match Scoring"}
                        </h2>
                        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
                            R{match.bracket_round} • Match {match.match_number}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Camera Toggle for Finals */}
                        {isFinalsMatch && (
                            <CameraToggleButton matchId={match.id} currentStreamer={match.metadata?.streaming_judge_id} refresh={refresh} currentlyStreamingMatchId={currentlyStreamingMatchId} />
                        )}
                        <button onClick={() => {
                            // If streaming, ensure we stop it before closing
                            if (match?.metadata?.streaming_judge_id === user?.id) {
                                toggleCameraStreamAction(match.id, false).catch(console.error);
                            }
                            // Clear scoring_active highlight
                            syncMatchStateAction(match.id, scoreA, scoreB, {
                                ...(match.metadata || {}),
                                scoring_active: false,
                            }).catch(console.error);
                            refresh();
                            onClose();
                        }} className="p-2 hover:bg-muted rounded-full">
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* GAME AREA - Force Row even on mobile */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 md:p-8 relative bg-slate-50/50 dark:bg-slate-950/50 flex flex-row gap-1 md:gap-8">

                    {/* LEFT PLAYER */}
                    <PlayerConsole
                        player={pA} label="P1"
                        score={scoreA} setScore={currentSetScoreA}
                        warnings={warningsA}
                        isWinner={scoreA >= WINNING_SCORE}
                        colorClass="primary"
                        onScore={(p: number, t: string) => handleScore('A', p, t)}
                        onWarn={() => handleWarning('A')}
                        bey={beyA} setBey={setBeyA}
                        isBestOf3={isBestOf3}
                        disabled={isGameOver}
                    />

                    {/* CENTER CONTROLS (Undo, Submit) - Narrow Column */}
                    <div className="flex flex-col items-center justify-center gap-2 p-1 border-x bg-background/50 w-12 md:w-32 shrink-0 z-10">
                        <button onClick={handleUndo} disabled={history.length === 0} className="md:w-16 md:h-16 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                            <Undo2 className="w-4 h-4 md:w-6 md:h-6" />
                        </button>

                        {isGameOver && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex flex-col items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-lg p-1 md:p-3 shadow-green-500/20 shadow-lg transition-all hover:scale-105 w-full"
                            >
                                <Trophy className="w-4 h-4 md:w-6 md:h-6" />
                                <span className="text-[8px] md:text-[10px] font-black uppercase hidden md:block">Finish</span>
                            </button>
                        )}
                    </div>

                    {/* RIGHT PLAYER */}
                    <PlayerConsole
                        player={pB} label="Player 2"
                        score={scoreB} setScore={currentSetScoreB}
                        warnings={warningsB}
                        isWinner={scoreB >= WINNING_SCORE}
                        colorClass="destructive"
                        onScore={(p: number, t: string) => handleScore('B', p, t)}
                        onWarn={() => handleWarning('B')}
                        bey={beyB} setBey={setBeyB}
                        isBestOf3={isBestOf3}
                        disabled={isGameOver}
                    />

                </div>
            </div>



            {/* Logic for Streamer */}
            {user && match?.metadata?.streaming_judge_id === user.id && (
                <>

                    <CameraStreamer matchId={match.id} broadcasterId={match.metadata?.broadcaster_id} onClose={() => {
                        console.log("Closing Camera Streamer manually");
                        // Optimistically update metadata locally or call toggle off
                        toggleCameraStreamAction(match.id, false).then(() => refresh());
                    }} />
                </>
            )}
        </div>
    );
}

// Sub-Component for Player Section to reduce duplication
function PlayerConsole({ player, label, score, setScore, warnings, isWinner, colorClass, onScore, onWarn, bey, setBey, isBestOf3, disabled }: any) {
    const isPrimary = colorClass === "primary";
    const bgWin = isPrimary ? "bg-green-500/10 border-green-500" : "bg-green-500/10 border-green-500";
    const textWin = "text-green-600";
    const textNormal = isPrimary ? "text-primary" : "text-destructive";

    return (
        <div className={cn(
            "flex-1 flex flex-col gap-4 p-4 rounded-xl border-2 transition-all",
            isWinner ? bgWin : "bg-card border-border"
        )}>
            {/* NAME & META */}
            <div className="text-center space-y-1">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-black truncate">{player?.display_name || "Unknown"}</div>

                {/* Beyblade Input */}
                <input
                    className="w-full text-center text-xs bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-primary outline-none py-1 placeholder:text-muted-foreground/50 transition-colors"
                    placeholder="Enter Beyblade used (Optional)..."
                    value={bey}
                    onChange={(e) => setBey(e.target.value)}
                />
            </div>

            {/* SCORE DISPLAY */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 relative min-h-[120px]">
                {/* Main Score (Sets or Points) */}
                <span className={cn("text-8xl font-black tracking-tighter tabular-nums leading-none", isWinner ? textWin : textNormal)}>
                    {score}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground mt-2">
                    {isBestOf3 ? "Sets Won" : "Points"}
                </span>

                {/* Sub Score for Sets */}
                {isBestOf3 && (
                    <div className="absolute top-0 right-0 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border shadow-sm flex flex-col items-center">
                        <span className="text-xl font-bold font-mono">{setScore}</span>
                        <span className="text-[8px] uppercase text-muted-foreground">Current Set</span>
                    </div>
                )}
            </div>

            {/* WARNINGS */}
            <div className="flex justify-center gap-2 mb-2">
                {[1, 2].map(i => (
                    <div key={i} className={cn("w-3 h-3 rounded-full border border-yellow-500 transition-colors", warnings >= i ? "bg-yellow-500" : "bg-transparent")} />
                ))}
            </div>

            {/* CONTROLS */}
            <div className="grid grid-cols-2 gap-2 mt-auto">
                <ScoreBtn onClick={() => onScore(1, 'spin')} label="Spin" pts={1} color="blue" disabled={disabled} />
                <ScoreBtn onClick={() => onScore(2, 'over')} label="Over" pts={2} color="orange" disabled={disabled} />
                <ScoreBtn onClick={() => onScore(2, 'burst')} label="Burst" pts={2} color="red" disabled={disabled} />
                <ScoreBtn onClick={() => onScore(3, 'xtreme')} label="Xtreme" pts={3} color="purple" disabled={disabled} />
            </div>

            <button onClick={onWarn} disabled={disabled} className="w-full py-2 mt-2 text-xs font-bold uppercase text-yellow-600 hover:bg-yellow-500/10 rounded border border-transparent hover:border-yellow-500/20 transition-colors">
                Issue Warning
            </button>
        </div>
    );
}

function ScoreBtn({ onClick, label, pts, color, disabled }: any) {
    const styles = {
        blue: "bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 border-blue-500/20",
        orange: "bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 border-orange-500/20",
        red: "bg-red-500/5 hover:bg-red-500/10 text-red-600 border-red-500/20",
        purple: "bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 border-purple-500/20",
    };

    return (
        <button
            onClick={onClick} disabled={disabled}
            className={cn("h-16 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none", styles[color as keyof typeof styles])}
        >
            <span className="text-xl font-black">{pts}</span>
            <span className="text-[10px] font-bold uppercase opacity-75">{label}</span>
        </button>
    )
}

function CameraToggleButton({ matchId, currentStreamer, refresh, currentlyStreamingMatchId }: { matchId: string, currentStreamer: string | null, refresh: () => void, currentlyStreamingMatchId?: string | null }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // UI state: Active if ANYONE is streaming (red), Inactive if none (gray)
    const isActive = !!currentStreamer;
    const isLocked = !!currentlyStreamingMatchId && currentlyStreamingMatchId !== matchId;

    async function handleToggle() {
        setLoading(true);
        try {
            // If active -> Turn Off. If inactive -> Turn On.
            const isStreaming = !!currentStreamer; // Re-derive specifically
            const newStatus = !isStreaming;
            const broadcasterId = newStatus ? `broadcaster-${matchId}-${Date.now()}` : undefined;

            const res = await toggleCameraStreamAction(matchId, newStatus, broadcasterId);

            if (!res.success) {
                alert(res.error || "Failed to toggle camera stream");
            } else {
                toast({ title: newStatus ? "Gone Live!" : "Stream Ended", description: newStatus ? "You are now streaming this match." : "Camera stream unavailable." });
                refresh();
            }
        } catch (error) {
            console.error("Camera Toggle Error:", error);
            alert("An unexpected error occurred while toggling the camera.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading || isLocked}
            title={isLocked ? "Another match is currently live" : ""}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
                isActive
                    ? "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse"
                    : isLocked
                        ? "bg-muted/30 text-muted-foreground/50 border-transparent cursor-not-allowed"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            )}
        >
            <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-red-600" : isLocked ? "bg-slate-500/50" : "bg-slate-400")} />
            {loading ? "..." : (isActive ? "LIVE" : isLocked ? "BUSY" : "CAM")}
        </button>
    )
}
