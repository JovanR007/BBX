"use client";

import { useState, useEffect } from "react";
import { acceptInviteAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Trophy, MapPin, Store as StoreIcon, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { getUserDecks } from "@/lib/decks";

export function InviteCard({ invite, user }: { invite: any, user: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [decks, setDecks] = useState<any[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>("no_deck");
    const [loadingDecks, setLoadingDecks] = useState(false);

    const tournament = invite.tournaments;
    const store = tournament.stores;

    // Fetch user's decks when component mounts (if user is logged in)
    useEffect(() => {
        async function fetchDecks() {
            if (!user) return;
            setLoadingDecks(true);
            const data = await getUserDecks(user.id);
            setDecks(data || []);
            setLoadingDecks(false);
        }
        fetchDecks();
    }, [user]);

    async function handleAccept() {
        if (!user) {
            router.push("/sign-in");
            return;
        }

        setLoading(true);
        const deckId = selectedDeckId === "no_deck" ? null : selectedDeckId;
        const res = await acceptInviteAction(invite.token, deckId);

        if (res.success) {
            toast({
                title: res.alreadyJoined ? "Already Joined!" : "Welcome!",
                description: `You have joined ${tournament.name}`,
                variant: "success"
            });
            router.push(`/t/${res.tournamentId}`);
        } else {
            if (res.notAuthenticated) {
                router.push("/sign-in?returnTo=" + window.location.pathname);
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
                setLoading(false);
            }
        }
    }

    return (
        <Card className="w-full max-w-md shadow-lg border-primary/20">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <CardDescription>You have been invited to compete!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-[20px_1fr] gap-3 text-sm">
                    <StoreIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                        <span className="font-semibold block">{store.name}</span>
                        <span className="text-muted-foreground text-xs">Host Store</span>
                    </div>

                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                        <span className="block">{store.city}, {store.country}</span>
                        <span className="text-muted-foreground text-xs">Location</span>
                    </div>
                </div>

                {/* Deck Selection */}
                {user && decks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Select Your Deck (Optional)
                        </label>
                        <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a deck..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no_deck" className="text-muted-foreground italic">No Deck</SelectItem>
                                {decks.map((deck: any) => (
                                    <SelectItem key={deck.id} value={deck.id} className="font-medium">
                                        {deck.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {user && loadingDecks && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading your decks...
                    </div>
                )}

                {!user && (
                    <div className="bg-muted p-3 rounded-md text-xs text-center text-muted-foreground">
                        You must be signed in to accept this invitation.
                    </div>
                )}
            </CardContent>
            <CardFooter>
                {user ? (
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleAccept}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Accept & Join Tournament
                    </Button>
                ) : (
                    <Button asChild className="w-full" size="lg">
                        <Link href={`/sign-in?returnTo=/t/invite/${invite.token}`}>
                            Sign In to Accept
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
