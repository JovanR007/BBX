"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { reportMatchAction } from "@/app/actions";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatches();
    }, []);

    async function fetchMatches() {
        setLoading(true);
        // Fetch Pending Matches from Top Cut
        const { data } = await supabase
            .from("matches")
            .select("*")
            .eq("stage", "top_cut")
            .eq("status", "pending")
            .order("bracket_round", { ascending: true })
            .order("match_number", { ascending: true });

        setMatches(data || []);
        setLoading(false);
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold mb-8">Admin Console</h1>

            <div className="grid gap-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" /> Pending Matches
                    </h2>

                    {loading ? (
                        <div>Loading pending matches...</div>
                    ) : matches.length === 0 ? (
                        <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                            No pending matches found. The round might be complete!
                            <br />
                            <span className="text-xs">Go to dashboard to advance round (Coming Soon)</span>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {matches.map(m => (
                                <MatchReportCard key={m.id} match={m} refresh={fetchMatches} />
                            ))}
                        </div>
                    )}
                </section>

                <section className="border-t pt-8">
                    <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Dangerous Zone</h2>
                    <AdvanceRoundButton />
                </section>
            </div>
        </div>
    );
}

import { advanceBracketAction } from "@/app/actions";

function AdvanceRoundButton() {
    const [loading, setLoading] = useState(false);

    async function handleAdvance() {
        if (!confirm("Are you sure you want to advance to the next round? ensure all matches are complete.")) return;
        setLoading(true);
        const res = await advanceBracketAction();
        setLoading(false);
        if (res.success) {
            alert("Round Advanced Successfully!");
            window.location.reload();
        } else {
            alert("Error: " + res.error);
        }
    }

    return (
        <button
            onClick={handleAdvance}
            disabled={loading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded text-sm font-medium border border-border"
        >
            {loading ? "Advancing..." : "Advance Bracket to Next Round"}
        </button>
    )
}

function MatchReportCard({ match, refresh }) {
    // Local State for Form
    const [scoreA, setScoreA] = useState(match.score_a || 0);
    const [scoreB, setScoreB] = useState(match.score_b || 0);
    const [finish, setFinish] = useState("spin");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(formData) {
        setSubmitting(true);
        // Append hidden fields
        formData.append("match_id", match.id);
        formData.append("target_points", match.target_points);
        formData.append("p_a", match.participant_a_id);
        formData.append("p_b", match.participant_b_id);

        const res = await reportMatchAction(formData);
        if (res.success) {
            refresh(); // Reload list
        } else {
            alert("Error: " + res.error);
            setSubmitting(false);
        }
    }

    return (
        <form action={handleSubmit} className="border rounded-lg bg-card p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Match Info */}
            <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Round {match.bracket_round} • Match {match.match_number} • Target {match.target_points}
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-primary">{match.participant_a_id.substring(0, 6)}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-primary">{match.participant_b_id.substring(0, 6)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
                <div className="flex flex-col items-center">
                    <label className="text-[10px] uppercase text-muted-foreground">P1 Score</label>
                    <input name="score_a" type="number" className="w-12 h-8 text-center bg-background border rounded" value={scoreA} onChange={e => setScoreA(Number(e.target.value))} />
                </div>
                <div className="text-lg font-bold text-muted-foreground">-</div>
                <div className="flex flex-col items-center">
                    <label className="text-[10px] uppercase text-muted-foreground">P2 Score</label>
                    <input name="score_b" type="number" className="w-12 h-8 text-center bg-background border rounded" value={scoreB} onChange={e => setScoreB(Number(e.target.value))} />
                </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-[10px] uppercase text-muted-foreground">Winning Move</label>
                <select name="finish_type" className="h-8 bg-background border rounded text-sm px-2" value={finish} onChange={e => setFinish(e.target.value)}>
                    <option value="spin">Spin (1pt)</option>
                    <option value="over">Over (2pts)</option>
                    <option value="burst">Burst (2pts)</option>
                    <option value="xtreme">Xtreme (3pts)</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded font-semibold text-sm disabled:opacity-50"
            >
                {submitting ? "..." : "Submit"}
            </button>
        </form>
    );
}
