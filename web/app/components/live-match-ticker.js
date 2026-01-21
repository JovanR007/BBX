"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LiveMatchTicker() {
    const [matches, setMatches] = useState([]);

    // Fetch initial data & subscribe
    useEffect(() => {
        const fetchLatest = async () => {
            // Query: Matches + Participant Names + Store Name (via Tournament)
            // Relaxed Query: Left Join allows null stores without breaking
            const { data, error } = await supabase
                .from("matches")
                .select(`
          id,
          score_a,
          score_b,
          status,
          participant_a:participants!participant_a_id(display_name),
          participant_b:participants!participant_b_id(display_name),
          tournaments(
            stores(name)
          )
        `)
                .order("updated_at", { ascending: false })
                .limit(10);


            if (data) {
                setMatches(formatMatches(data));
            }
        };

        fetchLatest();

        // Realtime Subscription
        const channel = supabase
            .channel('live-ticker')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches' },
                (payload) => {
                    fetchLatest();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Helper to format DB response to Ticker format
    const formatMatches = (dbMatches) => {
        // Filter OUT completed matches (User wants only active)
        const activeMatches = dbMatches.filter(m => m.status !== 'complete');

        return activeMatches.map(m => {
            // Show score if match is NOT pending/draft (i.e. if it has started scoring)
            // Actually, if status is 'pending', we show score if it's > 0-0? 
            // The previous logic was: showScore = m.status !== 'pending' && m.status !== 'draft';
            // But if we filter OUT complete, and draft is usually hidden, we only have 'pending'.
            // In BeyBracket, 'pending' matches HAVE scores updated live.
            // So we should ALWAYS show scores for active pending matches.
            // VS is only for 0-0?
            const isZeroZero = (m.score_a === 0 && m.score_b === 0);
            const scoreDisplay = isZeroZero ? 'VS' : `${m.score_a}-${m.score_b}`;

            return {
                id: m.id,
                p1: m.participant_a?.display_name || "TBA",
                p2: m.participant_b?.display_name || "TBA",
                score: scoreDisplay,
                store: m.tournaments?.stores?.name || "Unknown Store",
                status: m.status
            };
        });
    };

    // Fallback Mock if empty
    const displayMatches = matches.length > 0 ? matches : [];

    // Logic to ensure minimal length for scrolling
    const rawList = displayMatches.length > 0 ? displayMatches : [{ p1: "Waiting for Matches...", p2: "", score: "LIVE", store: "System" }];

    // Ensure enough items for a smooth loop (at least 10 items)
    let loopMatches = [...rawList];
    while (loopMatches.length < 10) {
        loopMatches = [...loopMatches, ...rawList];
    }
    // Double it for the sliding window technique
    const finalTickerList = [...loopMatches, ...loopMatches];

    return (
        <div className="w-full min-w-full bg-slate-950/50 border-y border-cyan-900/30 overflow-hidden py-2 backdrop-blur-sm relative z-20">
            <div className="container mx-auto flex items-center">
                <div className="flex items-center text-cyan-400 font-bold px-4 border-r border-cyan-800/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] z-30 bg-slate-950/80">
                    <Zap className="w-4 h-4 mr-2 animate-pulse text-yellow-400" />
                    LIVE FEED
                </div>
                <div className="flex-1 overflow-hidden relative mask-linear-fade">
                    {/* Ticker Container with Inline Animation Styles to guarantee behavior */}
                    <div
                        className="flex whitespace-nowrap gap-8 hover:[animation-play-state:paused]"
                        style={{
                            animation: 'ticker 60s linear infinite', // Slower, smoother speed
                            width: 'max-content'
                        }}
                    >
                        {finalTickerList.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="font-bold text-white max-w-[150px] truncate">{m.p1}</span>
                                <span className="text-cyan-500 font-bold">vs</span>
                                <span className="font-bold text-white max-w-[150px] truncate">{m.p2}</span>

                                <span className={`px-2 py-0.5 rounded border text-xs font-bold min-w-[3rem] text-center ${m.status === 'complete'
                                    ? 'bg-purple-950/50 text-purple-300 border-purple-800'
                                    : (m.score === 'VS' ? 'bg-slate-800/50 text-slate-400 border-slate-700'
                                        : 'bg-cyan-950/50 text-cyan-300 border-cyan-800 animate-pulse')
                                    }`}>
                                    {m.score}
                                </span>

                                <span className="text-xs text-slate-500 hidden lg:inline-block">@{m.store}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mask-linear-fade {
            mask-image: linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent);
        }
      `}</style>
        </div>
    );
}
