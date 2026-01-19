import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useTournament(paramId) {
    const [tournamentId, setTournamentId] = useState(null);
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function resolveTournament() {
            if (!paramId) {
                setLoading(false);
                return;
            }

            try {
                // Determine if paramId is UUID or Slug to avoid Postgres errors (invalid input syntax for type uuid)
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);

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
            } catch (err) {
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
