"use client";

import { useEffect, useState } from "react";
import { X, RefreshCcw, AlertTriangle, Trophy, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportMatchAction, forceUpdateMatchScoreAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";

export function MatchScoringModal({ isOpen, onClose, match, participants, refresh }) {
    const { toast } = useToast();
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [warningsA, setWarningsA] = useState(0);
    const [warningsB, setWarningsB] = useState(0);
    const [lastMove, setLastMove] = useState(null); // { player: 'A'|'B', type: 'spin'|'over'|'burst'|'pocket' }
    const [submitting, setSubmitting] = useState(false);
    const [history, setHistory] = useState([]);

    // Initial state setup if reopening? usually start fresh or load partial.
    // For now, simpler to start partials from scratch or use provided match.score
    // But user wants "Live" scoring. We'll start from what the DB says (likely 0-0).
    useEffect(() => {
        if (isOpen && match) {
            setScoreA(match.score_a || 0);
            setScoreB(match.score_b || 0);
            setWarningsA(0);
            setWarningsB(0);
            setLastMove(null);
            setHistory([]);
        }
    }, [isOpen, match]);

    if (!isOpen || !match) return null;

    const WINNING_SCORE = 4;
    const isGameOver = scoreA >= WINNING_SCORE || scoreB >= WINNING_SCORE;

    // Resolve Participants
    // If participants map is provided, use it. Otherwise try match.participant_a (backward compat)
    const pA = participants ? participants[match?.participant_a_id] : match?.participant_a;
    const pB = participants ? participants[match?.participant_b_id] : match?.participant_b;

    // Determine Winner Object
    const winner = scoreA >= WINNING_SCORE ? pA : (scoreB >= WINNING_SCORE ? pB : null);

    // Helper to save history before move
    const saveState = () => {
        setHistory(prev => [...prev, { scoreA, scoreB, warningsA, warningsB, lastMove }]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setScoreA(previous.scoreA);
        setScoreB(previous.scoreB);
        setWarningsA(previous.warningsA);
        setWarningsB(previous.warningsB);
        setLastMove(previous.lastMove);
        setHistory(prev => prev.slice(0, -1));
        toast({ title: "Undone", description: "Reverted last action." });
    };

    // Scoring Logic
    const handleScore = (player, pts, type) => {
        if (isGameOver) return;
        saveState();

        if (player === 'A') {
            setScoreA(prev => Math.min(prev + pts, 99)); // Cap just in case
            setLastMove({ player: 'A', type });
        } else {
            setScoreB(prev => Math.min(prev + pts, 99));
            setLastMove({ player: 'B', type });
        }

        // Reset warnings after a scored round
        setWarningsA(0);
        setWarningsB(0);
    };

    const handleWarning = (player) => {
        if (isGameOver) return;
        saveState();

        if (player === 'A') {
            const newWarnings = warningsA + 1;
            if (newWarnings >= 2) {
                // Penalty: Opponent gets 1 pt
                setScoreB(prev => prev + 1);
                setWarningsA(0); // Reset after penalty
                toast({ title: "Penalty Applied", description: "2 Warnings for P1 -> Point for P2", variant: "destructive" });
            } else {
                setWarningsA(newWarnings);
            }
        } else {
            const newWarnings = warningsB + 1;
            if (newWarnings >= 2) {
                // Penalty: Opponent gets 1 pt
                setScoreA(prev => prev + 1);
                setWarningsB(0); // Reset after penalty
                toast({ title: "Penalty Applied", description: "2 Warnings for P2 -> Point for P1", variant: "destructive" });
            } else {
                setWarningsB(newWarnings);
            }
        }
    };

    async function handleSubmit() {
        if (!isGameOver) return;
        setSubmitting(true);

        const form = new FormData();
        form.append("match_id", match.id);
        form.append("score_a", scoreA);
        form.append("score_b", scoreB);
        form.append("target_points", match.target_points);
        form.append("p_a", match.participant_a_id);
        form.append("p_b", match.participant_b_id);

        // Determine finish type from last move or default to 'spin' if unknown (e.g. penalty win)
        let finishType = 'spin';
        if (lastMove) {
            finishType = lastMove.type;
        }
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

    async function handleOverrideSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        const form = new FormData(e.currentTarget);
        form.append("match_id", match.id);

        const res = await forceUpdateMatchScoreAction(form);
        if (res.success) {
            toast({ title: "Score Updated", description: "Match result overridden.", variant: "success" });
            refresh();
            onClose();
        } else {
            toast({ title: "Override Failed", description: res.error, variant: "destructive" });
        }
        setSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <div>
                        <h2 className="text-lg font-bold">Match Scoring</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">
                            R{match.bracket_round} • Match {match.match_number}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Game Board */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative">

                    {/* Center Repeater (Desktop) */}
                    <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto">
                            <button onClick={handleUndo} disabled={history.length === 0} className="bg-secondary/80 hover:bg-secondary text-secondary-foreground p-4 rounded-full shadow-lg backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100" title="Undo Last Action">
                                <Undo2 className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Player A Console */}
                    <div className={cn("space-y-6 rounded-xl p-6 border-2 transition-colors",
                        scoreA >= WINNING_SCORE ? "border-green-500 bg-green-500/5" : "border-border bg-card/50"
                    )}>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold truncate">{pA?.display_name || 'Player 1'}</h3>
                            <div className="text-8xl font-black tabular-nums tracking-tighter text-primary">
                                {scoreA}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <ScoreBtn onClick={() => handleScore('A', 1, 'spin')} label="Spin Finish" pts={1} color="blue" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('A', 2, 'over')} label="Over Finish" pts={2} color="orange" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('A', 2, 'burst')} label="Burst Finish" pts={2} color="red" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('A', 3, 'xtreme')} label="Extreme Finish" pts={3} color="purple" disabled={isGameOver} />
                        </div>

                        {/* Warnings */}
                        <div className="pt-4 border-t flex items-center justify-between">
                            <button
                                onClick={() => handleWarning('A')}
                                disabled={isGameOver}
                                className="flex items-center gap-2 text-sm font-bold text-yellow-600 hover:text-yellow-500 disabled:opacity-50"
                            >
                                <AlertTriangle className="w-5 h-5" /> Warning ({warningsA}/2)
                            </button>
                            <div className="flex gap-1">
                                <div className={cn("w-3 h-3 rounded-full border border-yellow-600", warningsA >= 1 ? "bg-yellow-500" : "bg-transparent")} />
                                <div className={cn("w-3 h-3 rounded-full border border-yellow-600", warningsA >= 2 ? "bg-yellow-500" : "bg-transparent")} />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Center Repeater */}
                    <div className="md:hidden flex justify-center py-4">
                        <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full shadow-sm text-sm disabled:opacity-50">
                            <Undo2 className="w-4 h-4" /> Undo Last Action
                        </button>
                    </div>

                    {/* Player B Console */}
                    <div className={cn("space-y-6 rounded-xl p-6 border-2 transition-colors",
                        scoreB >= WINNING_SCORE ? "border-green-500 bg-green-500/5" : "border-border bg-card/50"
                    )}>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold truncate">{pB?.display_name || 'Player 2'}</h3>
                            <div className="text-8xl font-black tabular-nums tracking-tighter text-destructive">
                                {scoreB}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <ScoreBtn onClick={() => handleScore('B', 1, 'spin')} label="Spin Finish" pts={1} color="blue" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('B', 2, 'over')} label="Over Finish" pts={2} color="orange" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('B', 2, 'burst')} label="Burst Finish" pts={2} color="red" disabled={isGameOver} />
                            <ScoreBtn onClick={() => handleScore('B', 3, 'xtreme')} label="Extreme Finish" pts={3} color="purple" disabled={isGameOver} />
                        </div>

                        {/* Warnings */}
                        <div className="pt-4 border-t flex items-center justify-between">
                            <button
                                onClick={() => handleWarning('B')}
                                disabled={isGameOver}
                                className="flex items-center gap-2 text-sm font-bold text-yellow-600 hover:text-yellow-500 disabled:opacity-50"
                            >
                                <AlertTriangle className="w-5 h-5" /> Warning ({warningsB}/2)
                            </button>
                            <div className="flex gap-1">
                                <div className={cn("w-3 h-3 rounded-full border border-yellow-600", warningsB >= 1 ? "bg-yellow-500" : "bg-transparent")} />
                                <div className={cn("w-3 h-3 rounded-full border border-yellow-600", warningsB >= 2 ? "bg-yellow-500" : "bg-transparent")} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Submit */}
                {isGameOver && (
                    <div className="p-6 border-t bg-muted/40 animate-in slide-in-from-bottom flex flex-col items-center gap-4">
                        <div className="text-center">
                            <h4 className="text-xl font-bold flex items-center gap-2 justify-center text-green-500">
                                <Trophy className="w-6 h-6 fill-current" />
                                Victory for {winner?.display_name}!
                            </h4>
                            <p className="text-sm text-muted-foreground">Final Score: {scoreA} - {scoreB}</p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-bold text-lg shadow-xl hover:scale-105 transition-all w-full md:w-auto"
                        >
                            {submitting ? "Verifying..." : "Confirm Match Result"}
                        </button>
                    </div>
                )}

                {/* Admin Override Section (Always available for completed or stuck matches) */}
                <div className="p-4 border-t bg-destructive/5">
                    <details className="group">
                        <summary className="cursor-pointer text-xs font-bold text-destructive flex items-center gap-2 uppercase tracking-wide select-none">
                            <AlertTriangle className="w-4 h-4" /> Admin Override (Force Score)
                        </summary>
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <form onSubmit={handleOverrideSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">{pA?.display_name || "P1"} Score</label>
                                        <input type="number" name="score_a" defaultValue={match.score_a || 0} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required min="0" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">{pB?.display_name || "P2"} Score</label>
                                        <input type="number" name="score_b" defaultValue={match.score_b || 0} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required min="0" />
                                    </div>
                                </div>
                                <div className="space-y-1 w-full md:w-48">
                                    <label className="text-xs font-semibold text-muted-foreground">Admin PIN</label>
                                    <input type="password" name="admin_pin" placeholder="••••" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-widest font-mono" required />
                                </div>
                                <button type="submit" disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md font-bold text-sm shadow-sm whitespace-nowrap w-full md:w-auto">
                                    Force Update
                                </button>
                            </form>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                Warning: This bypasses normal game rules and checks. It will immediately update standings.
                            </p>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}

function ScoreBtn({ onClick, label, pts, color, disabled }) {
    const colorStyles = {
        blue: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20",
        orange: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border-orange-500/20",
        red: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20",
        purple: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border-purple-500/20",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-24 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                colorStyles[color]
            )}
        >
            <span className="text-2xl font-black">{pts}</span>
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</span>
        </button>
    )
}
