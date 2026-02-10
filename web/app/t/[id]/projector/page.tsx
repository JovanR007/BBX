
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useBracketData } from "@/hooks/use-bracket-data";
import { VictoryModal } from "@/components/features/victory-modal";
import { BracketConnector } from "@/components/features/bracket-connector";
import { SingleEliminationBracket, Match as CustomMatch } from "react-tournament-brackets";
import { Match, Participant } from "@/types";
import { QRCodeDisplay } from "@/components/features/qr-code";
import { Loader2, Crown, Trophy } from "lucide-react";
import { BrandedContainer } from "@/components/features/branded-container";

// Re-use theme from BracketPage (Typos fixed, type removed as it's not exported)
const BeybladeTheme = {
    textColor: { main: '#E2E8F0', highlighted: '#F8FAFC', dark: '#94A3B8', disabled: '#475569' },
    matchBackground: { wonColor: '#1e293b', lostColor: '#0f172a' },
    score: {
        background: { wonColor: '#1e293b', lostColor: '#0f172a' },
        text: { highlightedWonColor: '#22c55e', highlightedLostColor: '#ef4444' }
    },
    border: {
        color: '#334155',
        highlightedColor: '#22D3EE',
    },
    roundHeader: { backgroundColor: 'transparent', fontColor: '#94A3B8' },
    connectorColor: '#334155',
    connectorColorHighlight: '#22D3EE',
    svgBackground: 'transparent',
    fontFamily: '"Inter", sans-serif',
    transitionTimingFunction: 'ease-in-out',
    disabledColor: '#475569',
    roundHeaders: { background: 'transparent' },
    canvasBackground: 'transparent'
};

export default function ProjectorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);
    const {
        loading,
        tournament,
        matches,
        participants,
        viewMode,
        derived: {
            swissMatches,
            topCutMatches,
            winner,
            runnerUp,
            thirdPlace,
            isTournamentComplete
        }
    } = useBracketData(tournamentId);

    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    // ... (swissKing logic unchanged)
    const swissKing = useMemo(() => {
        if (!swissMatches || swissMatches.length === 0) return null;
        const scores: Record<string, { wins: number }> = {};
        Object.keys(participants).forEach(pid => scores[pid] = { wins: 0 });
        swissMatches.forEach(m => {
            if (m.status !== 'complete' || !m.winner_id) return;
            if (scores[m.winner_id]) scores[m.winner_id].wins++;
        });
        const kingId = Object.keys(scores).sort((a, b) => scores[b].wins - scores[a].wins)[0];
        if (!kingId) return null;
        return { ...participants[kingId], match_wins: scores[kingId].wins, buchholz: 0 };
    }, [swissMatches, participants]);

    // Transformed matches for bracket view
    const transformedMatches = useMemo(() => {
        if (viewMode !== 'top_cut' || topCutMatches.length === 0) return [];
        return topCutMatches.map(m => ({
            id: m.id,
            nextMatchId: (m as any).next_match_id || null, // Type assertion for missing property
            tournamentRoundText: `${m.bracket_round}`,
            startTime: '',
            state: m.status === 'complete' ? 'DONE' : 'SCHEDULED',
            participants: [
                {
                    id: m.participant_a_id || 'tbd-a',
                    resultText: m.score_a?.toString(),
                    isWinner: m.winner_id === m.participant_a_id,
                    status: m.status === 'complete' ? (m.winner_id === m.participant_a_id ? 'WON' : 'LOST') : null,
                    name: m.participant_a_id ? participants[m.participant_a_id]?.display_name : 'TBD',
                },
                {
                    id: m.participant_b_id || 'tbd-b',
                    resultText: m.score_b?.toString(),
                    isWinner: m.winner_id === m.participant_b_id,
                    status: m.status === 'complete' ? (m.winner_id === m.participant_b_id ? 'WON' : 'LOST') : null,
                    name: m.participant_b_id ? participants[m.participant_b_id]?.display_name : 'TBD',
                }
            ]
        }));
    }, [topCutMatches, participants, viewMode]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

    // Custom Match Component for Projector (Simpler than BracketPage)
    const ProjectorMatch = ({ match }: { match: any }) => {
        const topParty = match.participants[0];
        const bottomParty = match.participants[1];
        return (
            <div className="flex flex-col border border-slate-700 bg-slate-900/80 rounded w-[200px] overflow-hidden">
                <div className={`flex justify-between px-3 py-2 border-b border-slate-800 ${topParty.isWinner ? 'bg-green-900/20' : ''}`}>
                    <span className={`text-sm truncate ${topParty.isWinner ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{topParty.name}</span>
                    <span className="text-sm font-mono">{topParty.resultText || '-'}</span>
                </div>
                <div className={`flex justify-between px-3 py-2 ${bottomParty.isWinner ? 'bg-green-900/20' : ''}`}>
                    <span className={`text-sm truncate ${bottomParty.isWinner ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{bottomParty.name}</span>
                    <span className="text-sm font-mono">{bottomParty.resultText || '-'}</span>
                </div>
            </div>
        );
    }

    // 1. Tournament Complete / Winner View
    if (tournament?.status === 'completed' || (viewMode === 'top_cut' && winner)) {
        return (
            <BrandedContainer
                primaryColor={tournament?.stores?.primary_color}
                secondaryColor={tournament?.stores?.secondary_color}
                plan={tournament?.stores?.plan}
                className="min-h-screen bg-black overflow-hidden relative font-sans"
            >
                {/* Use VictoryModal but force it to look like a page content, remove close button logic if possible or just hide it via CSS if needed, but VictoryModal has a discrete close button we can ignore */}
                <div className="absolute inset-0 z-10">
                    <VictoryModal
                        isOpen={true}
                        onClose={() => { }}
                        winner={winner}
                        runnerUp={runnerUp}
                        thirdPlace={thirdPlace}
                        swissKing={swissKing}
                        tournamentName={tournament?.name ?? ""}
                        organizerName={tournament?.stores?.name || "Official Result"}
                    />
                </div>

                {/* QR Code Overlay - Z-Index higher than modal? Modal has z-50. We need to be careful. VictoryModal takes full screen fixed. 
                 We might need to inject the QR code INTO VictoryModal or layer it on top. 
                 VictoryModal uses `fixed inset-0 z-50`. We can place this at z-[60].
             */}
                <div className="fixed bottom-8 left-8 z-[60] bg-white p-2 rounded-xl shadow-2xl">
                    <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={100} />
                    <div className="text-center text-xs font-bold mt-1 text-black">Scan to View</div>
                </div>
            </BrandedContainer>
        );
    }

    // 2. Ongoing Bracket / Swiss View
    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center relative overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />

            {/* Header */}
            <header className="w-full flex justify-between items-center mb-8 z-10 relative">
                <div className="text-4xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    {tournament?.name}
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xl text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        {viewMode === 'swiss' ? 'Swiss Stage' : 'Finals Stage'}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full flex items-center justify-center overflow-auto">
                {viewMode === 'swiss' ? (
                    <div className="w-full max-w-6xl">
                        {/* We can reuse SwissView but strictly readonly and maybe scaled up? 
                             Or just show Top 10 standings? 
                             For now, let's just show the Swiss Matches via BracketConnector (visual) or a custom simplified list.
                             Actually, let's show the BracketConnector visual if possible, it looks cool.
                         */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Show current round matches only? */}
                            {swissMatches.filter(m => m.status !== 'complete').slice(0, 12).map(m => ( // Show up to 12 active matches
                                <div key={m.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex justify-between items-center relative overflow-hidden">
                                    {m.metadata?.streaming_judge_id && <div className="absolute top-0 right-0 p-1 bg-red-500/20 text-red-500 text-[10px] font-bold">LIVE</div>}
                                    <div className="font-bold text-lg">{m.participant_a_id ? participants[m.participant_a_id]?.display_name : 'TBD'}</div>
                                    <div className="font-mono text-slate-500 mx-4">VS</div>
                                    <div className="font-bold text-lg text-right">{m.participant_b_id ? participants[m.participant_b_id]?.display_name : 'TBD'}</div>
                                </div>
                            ))}
                            {swissMatches.filter(m => m.status !== 'complete').length === 0 && (
                                <div className="col-span-full text-center text-slate-500 text-2xl py-12">
                                    Round Complete. Waiting for next round...
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="scale-110 origin-top">
                        <SingleEliminationBracket
                            matches={transformedMatches}
                            matchComponent={ProjectorMatch}
                            theme={BeybladeTheme}
                            options={{
                                style: {
                                    width: 200,
                                    boxHeight: 100,
                                    spaceBetweenColumns: 80,
                                    spaceBetweenRows: 40,
                                    connectorColor: '#334155',
                                    connectorColorHighlight: '#22D3EE',
                                }
                            }}
                        />
                    </div>
                )}
            </main>

            {/* Footer / QR */}
            <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20 bg-slate-900/80 p-4 rounded-xl backdrop-blur-md border border-slate-800 shadow-2xl">
                <div className="text-right">
                    <div className="text-sm font-bold text-slate-300">Scan for Live Updates</div>
                    <div className="text-xs text-slate-500">beybracket.com</div>
                </div>
                <div className="bg-white p-1 rounded">
                    <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={64} />
                </div>
            </div>

        </BrandedContainer>
    );
}
