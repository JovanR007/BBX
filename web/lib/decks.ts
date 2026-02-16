"use server";

import { supabaseAdmin } from "./supabase-admin";

export interface BeyPart {
    id: string;
    name: string;
    type: 'blade' | 'ratchet' | 'bit' | 'lock_chip' | 'assist_blade' | 'integrated';
    series: 'BX' | 'UX' | 'CX';
    image_url?: string;
}

export interface Deck {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    image_url?: string;
    created_at: string;
    deck_beys: DeckBey[];
}

export interface DeckBey {
    id: string;
    deck_id: string;
    slot_number: 1 | 2 | 3;
    blade_id?: string;
    ratchet_id?: string;
    bit_id?: string;
    lock_chip_id?: string;
    assist_blade_id?: string;
    blade?: BeyPart;
    ratchet?: BeyPart;
    bit?: BeyPart;
    lock_chip?: BeyPart;
    assist_blade?: BeyPart;
}

export async function getAllParts() {
    const { data, error } = await supabaseAdmin
        .from('parts')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error fetching parts:", error);
        return [];
    }

    return data as BeyPart[];
}

export async function getUserDecks(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('decks')
        .select(`
            *,
            deck_beys (
                *,
                blade:parts!blade_id(*),
                ratchet:parts!ratchet_id(*),
                bit:parts!bit_id(*),
                lock_chip:parts!lock_chip_id(*),
                assist_blade:parts!assist_blade_id(*)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching user decks:", error);
        return [];
    }

    return data;
}

export async function createDeck(userId: string | null, deckData: any) {
    // 1. Create Deck
    const { data: deck, error: deckError } = await supabaseAdmin
        .from('decks')
        .insert({
            user_id: userId,
            name: deckData.name,
            description: deckData.description,
            image_url: deckData.image_url
        })
        .select()
        .single();

    if (deckError) throw deckError;

    // 2. Create Deck Beys
    if (deckData.beys && deckData.beys.length > 0) {
        const beysToInsert = deckData.beys.map((bey: any, index: number) => ({
            deck_id: deck.id,
            slot_number: index + 1,
            blade_id: bey.blade_id,
            ratchet_id: bey.ratchet_id,
            bit_id: bey.bit_id,
            lock_chip_id: bey.lock_chip_id || null,     // Only for CX
            assist_blade_id: bey.assist_blade_id || null // Only for CX
        }));

        const { error: beysError } = await supabaseAdmin
            .from('deck_beys')
            .insert(beysToInsert);

        if (beysError) throw beysError;
    }

    return deck;
}

export async function updateDeck(userId: string | null, deckId: string, deckData: any) {
    // 1. Update Deck Details
    const query = supabaseAdmin
        .from('decks')
        .update({
            name: deckData.name,
            description: deckData.description,
            image_url: deckData.image_url,
            updated_at: new Date().toISOString()
        })
        .eq('id', deckId);

    if (userId) {
        query.eq('user_id', userId);
    } else {
        query.is('user_id', null);
    }

    const { data: deck, error: deckError } = await query
        .select()
        .single();

    if (deckError) throw deckError;

    // 2. Update Deck Beys
    // Strategy: Delete all existing beys for this deck and re-insert (Simpler than upserting individual slots)
    if (deckData.beys && deckData.beys.length > 0) {

        // Delete existing beys
        const { error: deleteError } = await supabaseAdmin
            .from('deck_beys')
            .delete()
            .eq('deck_id', deckId);

        if (deleteError) throw deleteError;

        // Re-insert new beys
        const beysToInsert = deckData.beys.map((bey: any, index: number) => ({
            deck_id: deck.id,
            slot_number: index + 1,
            blade_id: bey.blade_id,
            ratchet_id: bey.ratchet_id,
            bit_id: bey.bit_id,
            lock_chip_id: bey.lock_chip_id || null,
            assist_blade_id: bey.assist_blade_id || null
        }));

        const { error: beysError } = await supabaseAdmin
            .from('deck_beys')
            .insert(beysToInsert);

        if (beysError) throw beysError;
    }

    return deck;
}

export async function deleteDeck(userId: string | null, deckId: string) {
    const query = supabaseAdmin
        .from('decks')
        .delete()
        .eq('id', deckId);

    if (userId) {
        query.eq('user_id', userId);
    } else {
        query.is('user_id', null);
    }

    const { error } = await query;

    if (error) throw error;
    return true;
}
