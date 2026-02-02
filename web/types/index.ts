export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Store {
    id: string;
    created_at: string;
    owner_id: string;
    name: string;
    slug: string;
    image_url: string | null;
    address: string | null;
    contact_number: string | null;
    city: string | null;
    country: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    plan?: 'free' | 'pro';
    latitude?: number | null;
    longitude?: number | null;
}

export interface Tournament {
    id: string;
    created_at: string;
    store_id: string | null;
    name: string;
    location: string;
    start_time: string;
    end_time?: string | null;
    description?: string | null;
    status: 'draft' | 'pending' | 'started' | 'completed';
    cut_size: number;
    slug: string | null;
    judge_code: string | null;
    match_target_points: number | null;
    swiss_rounds: number | null;
    is_ranked?: boolean;
    organizer_id?: string | null;
    ruleset_config?: any; // JSONB
    stores?: {
        name: string | null;
        primary_color: string | null;
        secondary_color: string | null;
        plan: 'free' | 'pro';
    };
}

export interface Participant {
    id: string;
    created_at: string;
    tournament_id: string;
    user_id: string | null;
    display_name: string;
    dropped: boolean;
}

export interface Match {
    id: string;
    created_at: string;
    tournament_id: string;
    stage: 'swiss' | 'top_cut';
    swiss_round_id: string | null;
    swiss_round_number: number;
    bracket_round: number;
    match_number: number;
    participant_a_id: string | null;
    participant_b_id: string | null;
    score_a: number;
    score_b: number;
    winner_id: string | null;
    status: 'pending' | 'complete' | 'draw' | 'scheduled';
    is_bye: boolean;
    target_points: number;
    bey_a?: string | null;
    bey_b?: string | null;
    metadata?: any; // JSONB
}

export interface MatchEvent {
    id: string;
    created_at: string;
    match_id: string;
    winner_participant_id: string | null;
    finish: 'spin' | 'over' | 'burst' | 'xtreme' | 'auto-debug' | 'other';
    points_awarded: number;
}

export interface TournamentJudge {
    id: string;
    created_at: string;
    tournament_id: string;
    user_id: string;
}

// Server Action Response
export type ActionResult<T = void> =
    | { success: true; data?: T; message?: string; count?: number } // count/message for specific actions
    | { success: false; error: string };

export interface MatchHistory {
    round: number;
    result: 'W' | 'L' | 'D';
}

export interface SwissStanding {
    tournament_id: string;
    participant_id: string;
    display_name: string;
    match_wins: number;
    buchholz: number;
    point_diff: number;
    history: MatchHistory[];
}


export interface TournamentInvite {
    id: string;
    tournament_id: string;
    email: string;
    status: 'pending' | 'accepted' | 'declined';
    token: string;
    created_at: string;
}
