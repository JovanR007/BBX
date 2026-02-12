"use client";

import { useEffect, useState } from "react";
import { DeckBuilder } from "@/components/decks/deck-builder";
import { getUserDecks, Deck } from "@/lib/decks";
import { useUser } from "@stackframe/stack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function DecksPage() {
    const user = useUser();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create'>('list');

    useEffect(() => {
        if (user) {
            loadDecks();
        }
    }, [user]);

    async function loadDecks() {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserDecks(user.id);
            setDecks(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!user) {
        return <div className="p-8 text-center text-slate-400">Please sign in to manage your decks.</div>;
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Decks</h1>
                    <p className="text-slate-400">Manage your Beyblade configurations for tournaments.</p>
                </div>
                {view === 'list' && (
                    <Button onClick={() => setView('create')} className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
                        <Plus className="w-4 h-4" /> New Deck
                    </Button>
                )}
                {view === 'create' && (
                    <Button onClick={() => setView('list')} variant="ghost" className="text-slate-400 hover:text-white">
                        Cancel
                    </Button>
                )}
            </div>

            {view === 'create' ? (
                <DeckBuilder
                    userId={user.id}
                    onDeckCreated={() => {
                        loadDecks();
                        setView('list');
                    }}
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                            Loading decks...
                        </div>
                    ) : decks.length === 0 ? (
                        <div className="col-span-full py-12 text-center borderBorder-dashed border-2 border-slate-800 rounded-xl bg-slate-950/30">
                            <Sword className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No Decks Found</h3>
                            <p className="text-slate-500 mb-4">Create your first 3-on-3 deck to join tournaments!</p>
                            <Button onClick={() => setView('create')} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-950">
                                Create Deck
                            </Button>
                        </div>
                    ) : (
                        decks.map(deck => (
                            <Card key={deck.id} className="bg-slate-950 border-slate-800 overflow-hidden group hover:border-cyan-500/50 transition-colors">
                                {deck.image_url && (
                                    <div className="h-32 w-full overflow-hidden relative">
                                        <img src={deck.image_url} alt={deck.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="text-white flex justify-between items-start">
                                        <span>{deck.name}</span>
                                        {/* Future: Edit/Delete buttons */}
                                    </CardTitle>
                                    <p className="text-xs text-slate-500 line-clamp-2">{deck.description}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {deck.deck_beys?.map((bey, idx) => (
                                            <div key={idx} className="bg-slate-900/50 p-2 rounded text-sm text-slate-300 flex items-center gap-2">
                                                <span className="text-cyan-600 font-bold text-xs flex-shrink-0">#{bey.slot_number}</span>
                                                <div className="truncate">
                                                    <span className="font-medium text-white">{bey.blade?.name || "???"}</span>
                                                    <span className="text-slate-500 mx-1">/</span>
                                                    <span className="text-slate-400">{bey.ratchet?.name || "?"}</span>
                                                    <span className="text-slate-500 mx-1">/</span>
                                                    <span className="text-slate-400">{bey.bit?.name || "?"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
