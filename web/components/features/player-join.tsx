"use client";

import { useState, useEffect } from "react";
import { addParticipantAction } from "@/app/actions";
import { useUser } from "@stackframe/stack";
import { Loader2, UserPlus, Sword } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { getUserDecks, Deck } from "@/lib/decks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlayerJoinProps {
    tournamentId: string;
    isRegistered?: boolean;
}

export function PlayerJoin({ tournamentId, isRegistered }: PlayerJoinProps) {
    const user = useUser();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [decks, setDecks] = useState<Deck[]>([]);

    // Form State
    const [name, setName] = useState("");
    const [selectedDeckId, setSelectedDeckId] = useState<string>("no-deck");

    useEffect(() => {
        if (user) {
            setName(user.displayName || "");
            loadDecks();
        }
    }, [user]);

    async function loadDecks() {
        if (!user) return;
        const data = await getUserDecks(user.id);
        setDecks(data || []);
    }

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("name", name);
        if (user) formData.append("user_id", user.id);
        if (selectedDeckId && selectedDeckId !== "no-deck") {
            formData.append("deck_id", selectedDeckId);
        }

        const res = await addParticipantAction(formData);

        if (res.success) {
            toast({ title: "Joined Tournament!", description: "Good luck, Blader!", variant: "success" });
            setOpen(false);
            window.location.reload();
        } else {
            toast({ title: "Join Failed", description: res.error, variant: "destructive" });
        }
        setLoading(false);
    }

    if (isRegistered) {
        return (
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 text-center">
                <p className="text-green-400 font-bold flex items-center justify-center gap-2">
                    <Sword className="w-4 h-4" /> You are registered!
                </p>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/20 animate-pulse">
                    <UserPlus className="w-4 h-4 mr-2" /> Join Tournament
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Join Tournament</DialogTitle>
                    <DialogDescription>
                        Enter your name and choose your deck to participate.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleJoin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Blader Name"
                            className="bg-slate-900 border-slate-800"
                            required
                        />
                    </div>

                    {user && (
                        <div className="space-y-2">
                            <Label>Select Deck (Optional)</Label>
                            <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                                <SelectTrigger className="bg-slate-900 border-slate-800">
                                    <SelectValue placeholder="Choose a deck..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="no-deck">No Deck / Decide Later</SelectItem>
                                    {decks.map(deck => (
                                        <SelectItem key={deck.id} value={deck.id}>
                                            {deck.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500">
                                Selecting a deck allows your opponents to see what they are up against in the results!
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !name} className="bg-cyan-600 hover:bg-cyan-500">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm Join
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
