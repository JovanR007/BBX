import { Match, Participant } from "@/types";

export interface ParticipantStats {
    id: string;
    wins: number;
    matchesPlayed: number;
    diff: number;
}

/**
 * Calculates standings based on match results.
 * Logic: Wins > Point Differential
 */
export function calculateStandings(
    participants: Record<string, Participant> | Participant[],
    matches: Match[]
): ParticipantStats[] {
    const stats: Record<string, ParticipantStats> = {};

    // 1. Initialize stats for all participants
    if (Array.isArray(participants)) {
        participants.forEach(p => {
            stats[p.id] = { id: p.id, wins: 0, matchesPlayed: 0, diff: 0 };
        });
    } else {
        Object.keys(participants).forEach(id => {
            stats[id] = { id, wins: 0, matchesPlayed: 0, diff: 0 };
        });
    }

    // 2. Tally results from completed matches
    matches.forEach(m => {
        if (m.status === 'complete' && m.winner_id) {
            const pA = m.participant_a_id;
            const pB = m.participant_b_id;

            if (pA && stats[pA]) {
                stats[pA].matchesPlayed++;
                stats[pA].diff += ((m.score_a || 0) - (m.score_b || 0));
                if (m.winner_id === pA) stats[pA].wins++;
            }

            if (pB && stats[pB]) {
                stats[pB].matchesPlayed++;
                stats[pB].diff += ((m.score_b || 0) - (m.score_a || 0));
                if (m.winner_id === pB) stats[pB].wins++;
            }
        }
    });

    // 3. Sort by Wins, then Point Differential
    return Object.values(stats).sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.diff - a.diff;
    });
}
