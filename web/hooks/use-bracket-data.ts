import { useState, useEffect, useCallback } from "react";
import { Match, Participant, Tournament } from "@/types";
import { getTournamentDataAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";
import { useUser } from "@stackframe/stack";
import { supabase } from "@/lib/supabase";

export function useBracketData(tournamentId: string | undefined) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"swiss" | "top_cut" | "empty" | "loading">("loading");

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [participants, setParticipants] = useState<Record<string, Participant>>({});
    const [isSwissFinished, setIsSwissFinished] = useState(false);

    // Permissions
    const [permissions, setPermissions] = useState({ isOwner: false, isJudge: false, isSuperAdmin: false });
    const user = useUser();

    const fetchData = useCallback(async (silent = false) => {
        if (!tournamentId) return;
        if (!silent) setLoading(true);

        const res = await getTournamentDataAction(tournamentId);

        if (!res.success) {
            toast({ title: "Error Loading Data", description: res.error, variant: "destructive" });
            setLoading(false);
            return;
        }

        const tourney = res.tournament;
        const fetchedMatches = res.matches;
        const parts = res.participants;
        const fetchedJudges = res.judges;

        setTournament(tourney as unknown as Tournament);

        // Check Permissions
        if (user && tourney) {
            let isOwner = false;

            // Check if user is organizer (for casual tournaments)
            if (tourney.organizer_id && tourney.organizer_id === user.id) {
                isOwner = true;
            }

            // Otherwise check store ownership (for ranked tournaments)
            if (!isOwner && tourney.store_id) {
                const { data: store } = await supabase
                    .from("stores")
                    .select("owner_id")
                    .eq("id", tourney.store_id)
                    .single();

                isOwner = store?.owner_id === user.id;
            }

            const isJudge = fetchedJudges?.some((j: any) => j.user_id === user.id) || false;
            const isSuperAdmin = user.primaryEmail === "shearjovan7@gmail.com";

            setPermissions({ isOwner, isJudge, isSuperAdmin });
        }

        // Ensure fetchedMatches is typed or fallback
        const safeMatches = fetchedMatches || [];

        const pMap: Record<string, Participant> = {};
        parts?.forEach((p: any) => { pMap[p.id] = p; });
        setParticipants(pMap);

        if (safeMatches.length === 0) {
            setMatches([]);
            setViewMode("empty");
            setLoading(false);
            return;
        }

        setMatches(safeMatches as Match[]);

        // Logic for viewMode and isSwissFinished
        const swissMatchesTemp = safeMatches.filter((m: any) => m.stage === "swiss");
        const topCutMatchesTemp = safeMatches.filter((m: any) => m.stage === "top_cut");

        let maxS = 0;
        let hasTC = topCutMatchesTemp.length > 0;

        if (swissMatchesTemp.length > 0) {
            maxS = Math.max(...swissMatchesTemp.map((m: any) => m.swiss_round_number));
        }

        if (maxS > 0) {
            const lastSwissRoundMatches = swissMatchesTemp.filter((m: any) => m.swiss_round_number === maxS);
            const allComplete = lastSwissRoundMatches.every((m: any) => m.status === "complete");
            const neededRounds = tourney?.swiss_rounds ?? 5;
            setIsSwissFinished(allComplete && maxS >= neededRounds); // Heuristic or check tournament settings in future
        } else {
            setIsSwissFinished(false);
        }

        if (hasTC) setViewMode("top_cut");
        else if (maxS > 0) setViewMode("swiss");
        else setViewMode("empty");

        setLoading(false);
    }, [tournamentId, toast, user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const actualId = tournament?.id;
        if (!actualId) return;

        // Subscribe to Realtime Changes using the resolved UUID
        const channel = supabase
            .channel(`tournament-data-${actualId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'matches',
                    filter: `tournament_id=eq.${actualId}`
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const newMatch = payload.new as Match;
                        setMatches(prev => prev.map(m => m.id === newMatch.id ? newMatch : m));
                    } else {
                        fetchData(true);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tournaments',
                    filter: `id=eq.${actualId}`
                },
                () => fetchData(true)
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'participants',
                    filter: `tournament_id=eq.${actualId}`
                },
                () => fetchData(true)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, tournament?.id]);

    // Derived Values
    const swissMatches = matches.filter(m => m.stage === "swiss");
    const maxSwissRound = swissMatches.length > 0 ? Math.max(...swissMatches.map(m => Number(m.swiss_round_number))) : 0;
    const currentSwissMatches = swissMatches.filter(m => Number(m.swiss_round_number) === maxSwissRound);
    const isRoundComplete = currentSwissMatches.length > 0 && currentSwissMatches.every(m => m.status === 'complete');

    const topCutMatches = matches.filter(m => m.stage === "top_cut");
    const maxBracketRound = topCutMatches.length > 0 ? Math.max(...topCutMatches.map(m => Number(m.bracket_round))) : 0;
    const currentBracketMatches = topCutMatches.filter(m => Number(m.bracket_round) === maxBracketRound);
    const isBracketRoundComplete = currentBracketMatches.length > 0 && currentBracketMatches.every(m => m.status === 'complete');
    const totalBracketRounds = tournament?.cut_size ? Math.ceil(Math.log2(tournament.cut_size)) : 0;
    const isTournamentComplete = isBracketRoundComplete && maxBracketRound >= totalBracketRounds;

    let winner = null, runnerUp = null, thirdPlace = null;

    // Calculate Winner/Podium if Grand Final is done, regardless of full tournament completion status
    // Calculate Winner/Podium if Grand Final is done, regardless of full tournament completion status
    const actualMaxBracketRound = Math.max(0, ...topCutMatches.map(m => Number(m.bracket_round)));
    // FIX: Strictly use totalBracketRounds to identify the Final Round. 
    // Do NOT fallback to actualMaxBracketRound, because that causes Semi-Final winners to be treated as Grand Champions.
    const targetRound = totalBracketRounds;

    if (targetRound > 0) {
        const gfMatch = topCutMatches.find(m => Number(m.bracket_round) === targetRound && m.match_number === 1);
        if (gfMatch && gfMatch.status === 'complete' && gfMatch.winner_id) {
            winner = participants[gfMatch.winner_id];
            const loserId = gfMatch.winner_id === gfMatch.participant_a_id ? gfMatch.participant_b_id : gfMatch.participant_a_id;
            if (loserId) runnerUp = participants[loserId];
        }
        // 3rd place logic usually implies a specific match number or round, often 'Match 2' of the Final Round or a separate 'Round 3' etc.
        // Assuming standard single elim where 3rd place match is often conceptually in the same 'Finals' phase or handled via `match_number`.
        // If your bracket generator puts 3rd place match as Match 2 of final round:
        const p3Match = topCutMatches.find(m => Number(m.bracket_round) === targetRound && m.match_number === 2);
        if (p3Match && p3Match.status === 'complete' && p3Match.winner_id) {
            thirdPlace = participants[p3Match.winner_id];
        }
    }

    // Also find Swiss King if exists
    // We can infer Swiss King from stats (Rank 1)
    // We don't have standings in matches... but we can fetch them or assume seed 1 is king if swiss passed
    // Actually `useBracketData` doesn't fetch standings. `BracketPage` loads `SwissView` which takes matches. 
    // Wait, `SwissView` calculates standings internally? No, `SwissView` takes matches and participants.
    // The `useBracketData` hook returns matches.
    // We can calculate Swiss King here if needed, or better yet, `BracketPage` can pass it.
    // For now let's just ensure winner/runnerUp/thirdPlace are populated.

    return {
        loading,
        viewMode,
        tournament,
        matches,
        participants,
        refresh: fetchData,
        derived: {
            swissMatches,
            maxSwissRound,
            currentSwissMatches,
            isSwissRoundComplete: isRoundComplete,
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
    };
}
