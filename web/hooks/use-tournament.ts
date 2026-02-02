import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Tournament } from "@/types";
import { useUser } from "@stackframe/stack";

interface UseTournamentResult {
    tournament: Tournament | null;
    tournamentId: string | null;
    loading: boolean;
    error: string | null;
    isOwner: boolean;
    isJudge: boolean;
}

export function useTournament(paramId: string | Promise<{ id: string }>): UseTournamentResult {
    const user = useUser();
    const [tournamentId, setTournamentId] = useState<string | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissions, setPermissions] = useState({ isOwner: false, isJudge: false });

    // Handle paramId unwrapping if needed (though typically handled by caller for simple hooks)
    // We assume string for simplicity as per existing pattern
    const idToResolve = paramId as string;

    useEffect(() => {
        async function fetchTournamentAndPermissions() {
            if (!idToResolve) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Tournament
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idToResolve);
                let query = supabase.from("tournaments").select("*, stores(primary_color, secondary_color, plan)");
                if (isUUID) query = query.or(`id.eq.${idToResolve},slug.eq.${idToResolve}`);
                else query = query.eq("slug", idToResolve);

                const { data: tourney, error: tError } = await query.single();
                if (tError) throw tError;
                if (!tourney) throw new Error("Tournament not found");

                setTournament(tourney);
                setTournamentId(tourney.id);

                // 2. Check Permissions (if user logged in)
                if (user && tourney) {
                    // Check ownership via Store
                    const { data: store } = await supabase
                        .from("stores")
                        .select("owner_id")
                        .eq("id", tourney.store_id)
                        .single();

                    let isOwner = store?.owner_id === user.id;

                    // ALSO check if user is the tournament organizer (for casual tournaments)
                    if (!isOwner && tourney.organizer_id) {
                        isOwner = tourney.organizer_id === user.id;
                    }

                    // Check Judge
                    const { count: judgeCount } = await supabase
                        .from("tournament_judges")
                        .select("*", { count: 'exact', head: true })
                        .eq("tournament_id", tourney.id)
                        .eq("user_id", user.id);

                    setPermissions({ isOwner, isJudge: (judgeCount || 0) > 0 });
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchTournamentAndPermissions();
    }, [idToResolve, user]);

    return {
        tournament,
        tournamentId,
        loading,
        error,
        isOwner: permissions.isOwner,
        isJudge: permissions.isJudge
    };
}

