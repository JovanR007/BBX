import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Tournament } from "@/types";

interface UseTournamentResult {
    tournament: Tournament | null;
    tournamentId: string | null;
    loading: boolean;
    error: string | null;
}

export function useTournament(paramId: string | Promise<{ id: string }>): UseTournamentResult {
    // If paramId is a promise (from Next.js params), we might need to await it or strict checking.
    // However, the caller usually unwraps params before passing here?
    // In Page components: const { id } = use(params); so paramId is string.

    // But let's assume paramId is string.
    const [tournamentId, setTournamentId] = useState<string | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function resolveTournament() {
            if (!paramId) {
                setLoading(false);
                return;
            }

            // Handle if paramId is still a promise? No, hook rules prevent awaiting inside body.
            // Caller must pass string.

            try {
                // Determine if paramId is UUID or Slug to avoid Postgres errors (invalid input syntax for type uuid)
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId as string);

                let query = supabase.from("tournaments").select("*");

                if (isUUID) {
                    query = query.or(`id.eq.${paramId},slug.eq.${paramId}`);
                } else {
                    query = query.eq("slug", paramId);
                }

                const { data, error } = await query.single();

                if (error) throw error;
                if (!data) throw new Error("Tournament not found");

                setTournament(data);
                setTournamentId(data.id);
            } catch (err: any) {
                console.error("useTournament Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        resolveTournament();
    }, [paramId]);

    return { tournament, tournamentId, loading, error };
}
