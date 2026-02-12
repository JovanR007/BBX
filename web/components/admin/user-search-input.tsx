"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, User, Layers } from "lucide-react";
import { searchUsersAndDecksAction } from "@/app/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserSearchInputProps {
    onSelectUser: (userId: string | null, displayName: string, decks: any[]) => void;
    onSelectDeck: (deckId: string | null) => void;
    onNameChange: (name: string) => void;
    selectedUserId: string | null;
    resetTrigger?: number;
}

export function UserSearchInput({ onSelectUser, onSelectDeck, onNameChange, selectedUserId, resetTrigger }: UserSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedUserDecks, setSelectedUserDecks] = useState<any[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>("no_deck");
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(query, 300);

    // Reset on trigger change (after successful add)
    useEffect(() => {
        setQuery("");
        setResults([]);
        setSelectedUserDecks([]);
        setSelectedDeckId("no_deck");
    }, [resetTrigger]);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search Effect
    useEffect(() => {
        async function search() {
            if (!debouncedQuery || debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            const res = await searchUsersAndDecksAction(debouncedQuery);
            if (res.success) {
                setResults(res.users || []);
                setOpen(true);
            }
            setLoading(false);
        }

        search();
    }, [debouncedQuery]);

    const handleSelectUser = (user: any) => {
        const name = user.display_name || user.username || user.email;
        setQuery(name);
        setSelectedUserDecks(user.decks || []);
        onSelectUser(user.id, name, user.decks || []);
        onNameChange(name);
        setOpen(false);
        setSelectedDeckId("no_deck");
        onSelectDeck(null);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setSelectedUserDecks([]);
        onSelectUser(null, "", []);
        onSelectDeck(null);
        onNameChange("");
    };

    return (
        <div className="space-y-3" ref={containerRef}>
            <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Player Name / Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            onNameChange(e.target.value);
                            if (e.target.value === "") handleClear();
                            else {
                                setOpen(true);
                                // If user changes text after selecting, clear the selection
                                if (selectedUserId) {
                                    onSelectUser(null, e.target.value, []);
                                    setSelectedUserDecks([]);
                                    onSelectDeck(null);
                                }
                            }
                        }}
                        placeholder="Type a name or search for a player..."
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {/* Dropdown Results */}
                {open && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        {results.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelectUser(user)}
                                className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{user.display_name || user.username || "Unknown"}</div>
                                    <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                                </div>
                                {user.decks?.length > 0 && (
                                    <div className="ml-auto text-xs bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                        <Layers className="w-3 h-3" /> {user.decks.length}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Deck Selection - After user is selected */}
            {selectedUserId && selectedUserDecks.length > 0 && (
                <div className="space-y-1 animate-in slide-in-from-top-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Select Deck
                    </label>
                    <Select
                        value={selectedDeckId}
                        onValueChange={(val) => {
                            setSelectedDeckId(val);
                            onSelectDeck(val === "no_deck" ? null : val);
                        }}
                    >
                        <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select a deck..." />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedUserDecks.map(deck => (
                                <SelectItem key={deck.id} value={deck.id} className="font-medium">
                                    {deck.name}
                                </SelectItem>
                            ))}
                            <SelectItem value="no_deck" className="text-muted-foreground italic">No Deck</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Linked but no decks */}
            {selectedUserId && selectedUserDecks.length === 0 && (
                <p className="text-[10px] text-muted-foreground bg-muted px-2 py-1.5 rounded">
                    ✓ Linked to account — this player has no saved decks yet.
                </p>
            )}
        </div>
    );
}
