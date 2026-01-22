"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Medal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { SwissStanding } from "@/types";

export default function StandingsPage() {
    const [standings, setStandings] = useState<SwissStanding[]>([]);
    const [cutSize, setCutSize] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            // 1. Get Tournament cut size
            // Note: In real app, we should fetch by ID. Here we assume the one available.
            // We will perform a broad search or use the one ID we know if env is tricky.
            // Using a loose query for now as 'swiss_standings' is a view.

            const { data: tourney } = await supabase
                .from("tournaments")
                .select("cut_size")
                .limit(1)
                .single();

            setCutSize(tourney?.cut_size || 0);

            const { data: stds, error } = await supabase
                .from("swiss_standings")
                .select("*")
                .order("match_wins", { ascending: false })
                .order("buchholz", { ascending: false })
                .order("point_diff", { ascending: false });

            if (stds) setStandings(stds);
            setLoading(false);
        }
        fetchData();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold mb-6">Swiss Standings</h1>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Rank</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Participant</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Wins</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Buchholz</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Pt. Diff</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr><td colSpan={6} className="p-4 text-center">Loading standings...</td></tr>
                            ) : standings.map((player, index) => {
                                const rank = index + 1;
                                const isQualifying = cutSize > 0 && rank <= cutSize;

                                return (
                                    <tr
                                        key={player.participant_id}
                                        className={cn(
                                            "border-b transition-colors hover:bg-muted/50",
                                            isQualifying ? "bg-primary/5" : ""
                                        )}
                                    >
                                        <td className="p-4 align-middle font-mono">{rank}</td>
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex items-center">
                                                {index === 0 && <Medal className="w-4 h-4 text-yellow-500 mr-2" />}
                                                {index === 1 && <Medal className="w-4 h-4 text-gray-400 mr-2" />}
                                                {index === 2 && <Medal className="w-4 h-4 text-amber-700 mr-2" />}
                                                {/* We use ID if name is missing from view, usually view has name if joined */}
                                                <span className="font-semibold">{player.participant_id.substring(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">{player.match_wins}</td>
                                        <td className="p-4 align-middle text-muted-foreground">{player.buchholz}</td>
                                        <td className="p-4 align-middle text-muted-foreground">{player.point_diff > 0 ? `+${player.point_diff}` : player.point_diff}</td>
                                        <td className="p-4 align-middle">
                                            {isQualifying ? (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                                                    Qualified
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
