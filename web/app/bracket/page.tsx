"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function BracketPage() {
    const [rounds, setRounds] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [maxRound, setMaxRound] = useState(0);

    useEffect(() => {
        async function fetchData() {
            const tournamentId = process.env.TEST_TOURNAMENT_ID; // See note in Home. Assuming strict single tourney mode.

            const { data: matches } = await supabase
                .from("matches")
                .select("*")
                .eq("stage", "top_cut")
                .order("bracket_round", { ascending: true })
                .order("match_number", { ascending: true });

            if (matches) {
                const grouped: Record<number, any[]> = {};
                let maxR = 0;
                matches.forEach(m => {
                    const r = m.bracket_round;
                    if (!grouped[r]) grouped[r] = [];
                    grouped[r].push(m);
                    if (r > maxR) maxR = r;
                });
                setRounds(grouped);
                setMaxRound(maxR);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 overflow-x-auto min-h-screen">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold mb-8">Tournament Bracket</h1>

            {loading ? (
                <div>Loading bracket...</div>
            ) : (
                <div className="flex flex-row gap-12 min-w-max pb-12">
                    {/* Render columns for each round */}
                    {Object.keys(rounds).map((roundKey) => {
                        const roundNum = Number(roundKey);
                        const roundMatches = rounds[roundNum];
                        const isFinals = roundNum === maxRound;

                        return (
                            <div key={roundNum} className="flex flex-col justify-around gap-8 min-w-[250px]">
                                <div className="text-center font-bold text-muted-foreground uppercase tracking-wider mb-4">
                                    {isFinals ? "Finals" : `Round ${roundNum}`}
                                </div>

                                <div className="flex flex-col justify-around flex-grow gap-8">
                                    {/* This Gap strategy is naive. 
                     Ideally, spacing should grow exponentially (gap-8, gap-16, gap-32).
                     Let's use inline styles/calc for "Tree" spacing if possible, or just flex-around.
                  */}
                                    {roundMatches.map((m) => (
                                        <MatchCard key={m.id} match={m} isFinals={isFinals} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}

function MatchCard({ match, isFinals }: { match: any; isFinals: boolean }) {
    // Basic Bracket Node
    const winnerId = match.winner_id;
    const isCompleted = match.status === "complete";

    // Shorten UUIDs
    const pA = match.participant_a_id ? match.participant_a_id.substring(0, 6) : "BYE";
    const pB = match.participant_b_id ? match.participant_b_id.substring(0, 6) : "BYE";

    return (
        <div className={cn(
            "border rounded-lg bg-card p-3 shadow-sm w-full relative",
            isFinals ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
        )}>
            {/* Connector Lines (Naive) could be added here via pseudo elements if we had exact heights */}

            <div className="flex flex-col gap-2">
                {/* Player A */}
                <div className={cn(
                    "flex justify-between items-center p-2 rounded",
                    winnerId === match.participant_a_id && isCompleted ? "bg-primary/20 font-bold" : "bg-muted/30"
                )}>
                    <span className="text-sm">{pA}</span>
                    <span className="font-mono text-sm">{match.score_a}</span>
                </div>

                {/* Player B */}
                <div className={cn(
                    "flex justify-between items-center p-2 rounded",
                    winnerId === match.participant_b_id && isCompleted ? "bg-primary/20 font-bold" : "bg-muted/30"
                )}>
                    <span className="text-sm">{pB}</span>
                    <span className="font-mono text-sm">{match.score_b}</span>
                </div>
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground flex justify-between uppercase">
                <span>M{match.match_number}</span>
                {isCompleted && match.match_number === 1 && isFinals && (
                    <span className="text-primary flex items-center gap-1 font-bold"><Trophy className="w-3 h-3" /> Champ</span>
                )}
            </div>
        </div>
    )
}
