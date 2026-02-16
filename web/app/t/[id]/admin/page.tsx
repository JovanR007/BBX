"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    reportMatchAction,
    advanceBracketAction,
    addParticipantAction,
    startTournamentAction,
    updateParticipantAction,
    deleteParticipantAction,
    dropParticipantAction,
    toggleRegistrationAction,
    endTournamentAction,
    getTournamentDataAction,
    toggleCheckInAction,
    bulkAddParticipantsAction,
    seedTournamentAction,
    validateBulkAddAction,
    bulkAddWithDecksAction
} from "@/app/actions";
import {
    ArrowLeft, CheckCircle, Users, UserPlus, Settings, Trash2, Pencil, X, Save, Lock, Unlock,
    Play, MonitorPlay, Loader2, Ban, Layers, Plus
} from "lucide-react";
import TournamentSettings from "./tournament-settings";
import { ConfirmationModal } from "@/components/ui/modal";
import { MatchScoringModal } from "@/components/features/match-scoring-modal";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { useTournament } from "@/hooks/use-tournament";
import { UserSearchInput } from "@/components/admin/user-search-input";
import { AdminDeckModal } from "@/components/admin/admin-deck-modal";

export default function AdminPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: paramId } = use(params);
    const { tournament, tournamentId, loading: tLoading, error: tError, isOwner } = useTournament(paramId);

    const [matches, setMatches] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [judges, setJudges] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [loadingData, setLoadingData] = useState(true);
    const [showStartModal, setShowStartModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [isRoundOne, setIsRoundOne] = useState(true);
    const currentlyStreamingMatch = matches.find(m => m.metadata?.streaming_judge_id);
    const { toast } = useToast();

    useEffect(() => {
        if (tournamentId) fetchData();
    }, [tournamentId, refreshTrigger]);

    async function fetchData() {
        if (!tournamentId) return;
        setLoadingData(true);

        const res = await getTournamentDataAction(tournamentId);

        if (!res.success) {
            toast({ title: "Error Loading Data", description: res.error, variant: "destructive" });
            setLoadingData(false);
            return;
        }

        const matchesData = res.matches || [];
        const partsData = res.participants || [];
        const judgesData = res.judges || [];

        setMatches(matchesData);
        setParticipants(partsData);
        setJudges(judgesData);

        const hasRoundTwo = matchesData.some((m: any) => m.swiss_round_number > 1);
        setIsRoundOne(!hasRoundTwo);
        setLoadingData(false);
    }

    if (tError) return <div className="p-8 text-center text-red-500">Error: {tError}</div>;
    if (tLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /> Loading...</div>;

    const loading = loadingData;

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-4">
                        <Link href={`/t/${tournamentId}`} className="p-2 hover:bg-muted rounded-md transition-colors" title="Back to Dashboard">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold leading-none">Admin Console</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                    tournament?.status === "draft" ? "bg-blue-500/10 text-blue-500" :
                                        tournament?.status === "started" ? "bg-green-500/10 text-green-500" :
                                            "bg-muted text-muted-foreground"
                                )}>
                                    {tournament?.status}
                                </span>
                                {tournament?.status === "started" && (
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                        Round {matches.length > 0 ? Math.max(...matches.map(m => m.swiss_round_number || 0)) : 1}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/t/${tournamentId}/projector`}
                            target="_blank"
                            className="hidden md:flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-2 rounded-lg font-bold hover:bg-yellow-500/20 transition-all uppercase tracking-wide text-xs"
                        >
                            <MonitorPlay className="w-3.5 h-3.5" /> Projector
                        </Link>

                        {tournament?.status === "started" ? (
                            <div className="flex items-center gap-2">
                                <AdvanceRoundButton tournamentId={tournamentId} />
                            </div>
                        ) : null}

                        <button className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="grid gap-8">
                    {/* Registration Management */}
                    <RegistrationSection
                        tournament={{ ...tournament, isRoundOne }}
                        participants={participants}
                        loading={loading}
                        fetchData={fetchData}
                        tournamentId={tournamentId}
                        isOwner={isOwner}
                    />

                    {/* Configuration Section */}
                    {tournament?.status !== "draft" && (
                        <section className="bg-card border rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" /> Tournament Settings
                            </h2>
                            {loading ? (
                                <div className="text-sm text-muted-foreground animate-pulse">Loading settings...</div>
                            ) : (tournament?.status === "started" || tournament?.status === "completed") ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col gap-3 text-destructive">
                                        <div className="flex items-center gap-3">
                                            <Play className="w-5 h-5" />
                                            <div>
                                                <h3 className="font-bold text-sm">Tournament In Progress</h3>
                                                <p className="text-xs opacity-90">Settings are locked while matches are underway.</p>
                                            </div>
                                        </div>
                                        <ConcludeTournamentSection tournamentId={tournamentId || ""} />
                                    </div>
                                    <div className="opacity-50 pointer-events-none">
                                        <label className="text-sm font-medium">Top Cut Size</label>
                                        <div className="p-2 border rounded bg-muted text-sm">Top {tournament?.cut_size}</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <form onSubmit={(e) => { e.preventDefault(); setShowStartModal(true); }} className="space-y-2">
                                        <input type="hidden" name="tournament_id" value={tournamentId || ""} />
                                        <label className="text-sm font-medium">Top Cut Size</label>
                                        <div className="flex gap-4 items-center">
                                            <div className="w-full max-w-xs">
                                                <select
                                                    key={tournament?.cut_size}
                                                    name="cut_size"
                                                    defaultValue={tournament?.cut_size || 8}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    {[4, 8, 12, 16, 24, 32, 48, 64]
                                                        .filter(size => size <= participants.filter((p: any) => p.checked_in).length)
                                                        .map(size => (
                                                            <option key={size} value={size}>Top {size}</option>
                                                        ))}
                                                </select>
                                            </div>
                                            <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center gap-2">
                                                <Play className="w-4 h-4 fill-current" /> Begin Tournament
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Options limited by checked-in player count ({participants.filter((p: any) => p.checked_in).length}).
                                        </p>
                                    </form>

                                    <ConfirmationModal
                                        isOpen={showStartModal}
                                        onClose={() => setShowStartModal(false)}
                                        title="Start Swiss Stage?"
                                        description={participants.filter(p => !p.checked_in).length > 0
                                            ? `⚠️ WARNING: ${participants.filter(p => !p.checked_in).length} players are NOT checked in. They will be REMOVED from the tournament if you proceed.`
                                            : "This will lock settings and generate the first round of matches. Are you sure you want to begin?"}
                                        confirmText={participants.filter(p => !p.checked_in).length > 0 ? "Remove Players & Start" : "Yes, Begin Tournament"}
                                        onConfirm={async () => {
                                            const form = document.querySelector('form[class="space-y-2"]') as HTMLFormElement;
                                            const formData = new FormData(form);
                                            const res = await startTournamentAction(formData);
                                            if (res?.success) {
                                                toast({ title: "Tournament Started", description: "Swiss Round 1 pairings have been generated!", variant: "success", duration: 5000 });
                                                router.push(`/t/${tournamentId}/bracket`);
                                            } else {
                                                toast({ title: "Error Starting", description: parseError(res.error), variant: "destructive" });
                                                setShowStartModal(false);
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </section>
                    )}

                    {/* General Settings */}
                    <TournamentSettings tournament={tournament} judges={judges} refresh={fetchData} />
                </div>

                {selectedMatch && (
                    <MatchScoringModal
                        isOpen={!!selectedMatch}
                        match={selectedMatch}
                        participants={participants.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {})}
                        onClose={() => { fetchData(); setSelectedMatch(null); }}
                        refresh={fetchData}
                        ruleset={tournament?.ruleset_config}
                        currentlyStreamingMatchId={currentlyStreamingMatch?.id}
                    />
                )}
            </div>
        </div>
    );
}

function AdvanceRoundButton({ tournamentId }: { tournamentId: any }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleAdvance() {
        if (!confirm("Are you sure you want to advance to the next round? ensure all matches are complete.")) return;
        setLoading(true);
        const res = await advanceBracketAction(tournamentId);
        setLoading(false);
        if (res.success) {
            toast({ title: "Bracket Advanced", description: "Next round generated successfully!", variant: "success" });
            window.location.reload();
        } else {
            toast({ title: "Advance Failed", description: parseError(res.error), variant: "destructive" });
        }
    }

    return (
        <button
            onClick={handleAdvance}
            disabled={loading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded text-sm font-medium border border-border"
        >
            {loading ? "Advancing..." : "Advance Bracket to Next Round"}
        </button>
    );
}

function ParticipantRow({ participant, index, tournamentId, refresh, readOnly, isStarted }: { participant: any, index: any, tournamentId: any, refresh: any, readOnly: any, isStarted: any }) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(participant.display_name);
    const [loading, setLoading] = useState(false);
    const [showDropModal, setShowDropModal] = useState(false);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [showAdminDeckModal, setShowAdminDeckModal] = useState(false);

    const deck = participant.deck;

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append("participant_id", participant.id);
        formData.append("tournament_id", tournamentId);
        formData.append("name", name);

        const res = await updateParticipantAction(formData);
        if (res.success) {
            setIsEditing(false);
            refresh();
            toast({ title: "Player Updated", description: "Name changed successfully.", variant: "success" });
        } else {
            toast({ title: "Update Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    async function handleDelete() {
        if (!confirm("Delete " + participant.display_name + "?")) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("participant_id", participant.id);
        formData.append("tournament_id", tournamentId);

        const res = await deleteParticipantAction(formData);
        if (res.success) {
            refresh();
            toast({ title: "Player Removed", description: "Participant deleted successfully.", variant: "default" });
        } else {
            toast({ title: "Delete Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    async function confirmDrop() {
        setLoading(true);
        const formData = new FormData();
        formData.append("participant_id", participant.id);
        formData.append("tournament_id", tournamentId);

        const res = await dropParticipantAction(formData);
        if (res.success) {
            refresh();
            toast({ title: "Player Dropped", description: "Participant removed from future pairings.", variant: "default" });
            setShowDropModal(false);
        } else {
            toast({ title: "Drop Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    async function handleToggleCheckIn() {
        setLoading(true);
        const formData = new FormData();
        formData.append("participant_id", participant.id);
        formData.append("tournament_id", tournamentId);
        formData.append("status", (!participant.checked_in).toString());

        const res = await toggleCheckInAction(formData);
        if (res.success) {
            refresh();
            toast({
                title: participant.checked_in ? "Check-in Revoked" : "Player Checked In",
                variant: "success"
            });
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    if (isEditing) {
        return (
            <form onSubmit={handleUpdate} className="flex items-center gap-2 p-1 rounded bg-muted/40 text-sm">
                <span className="text-xs font-mono text-muted-foreground w-6 text-center">{index + 1}.</span>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="flex-1 h-8 bg-background border px-2 rounded text-sm min-w-0"
                    autoFocus
                />
                <button type="submit" disabled={loading} className="p-1 hover:text-green-500">
                    <Save className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="p-1 hover:text-red-500">
                    <X className="w-4 h-4" />
                </button>
            </form>
        );
    }

    return (
        <>
            <div className={`flex items-center justify-between p-2 rounded transition-colors group ${participant.dropped ? "bg-red-500/10 hover:bg-red-500/20" : "bg-muted/40 hover:bg-muted/60"}`}>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}.</span>
                    <button
                        onClick={handleToggleCheckIn}
                        disabled={loading || readOnly}
                        className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            participant.checked_in ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-primary"
                        )}
                        title={participant.checked_in ? "Click to Revoke Check-in" : "Click to Check-in"}
                    >
                        {participant.checked_in && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <span className={`font-medium text-sm ${participant.dropped ? "text-muted-foreground line-through" : ""}`}>
                        {participant.display_name}
                    </span>
                    {participant.dropped && <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">Dropped</span>}
                    {deck ? (
                        <button
                            onClick={() => setShowDeckModal(true)}
                            className="ml-1 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <Layers className="w-3 h-3" />
                            {deck.name}
                        </button>
                    ) : (
                        !readOnly && (
                            <button
                                onClick={() => setShowAdminDeckModal(true)}
                                className="ml-1 text-[10px] bg-primary/10 text-primary hover:bg-primary px-2 py-0.5 rounded flex items-center gap-1 transition-all opacity-60 group-hover:opacity-100 cursor-pointer font-bold uppercase"
                            >
                                <Plus className="w-3 h-3" />
                                Add Deck
                            </button>
                        )
                    )}
                </div>

                {!readOnly && !participant.dropped && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!participant.checked_in && (
                            <button onClick={handleToggleCheckIn} className="text-[10px] bg-primary/10 text-primary hover:bg-primary px-2 py-1 rounded transition-all font-bold uppercase">
                                Check In
                            </button>
                        )}
                        {!participant.user_id && (
                            <button onClick={() => setIsEditing(true)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-background rounded-md transition-colors" title="Edit Name">
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                        {isStarted ? (
                            <button onClick={() => setShowDropModal(true)} className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-background rounded-md transition-colors" title="Drop Player">
                                <Ban className="w-3 h-3" />
                            </button>
                        ) : (
                            <button onClick={handleDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-background rounded-md transition-colors" title="Delete (Remove from DB)">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DropPlayerModal
                isOpen={showDropModal}
                onClose={() => setShowDropModal(false)}
                onConfirm={confirmDrop}
                playerName={participant.display_name}
                loading={loading}
            />

            <AdminDeckModal
                isOpen={showAdminDeckModal}
                onClose={() => setShowAdminDeckModal(false)}
                participantId={participant.id}
                userId={participant.user_id}
                playerName={participant.display_name}
                onDeckCreated={refresh}
            />

            {showDeckModal && deck && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeckModal(false)}>
                    <div className="bg-card border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-cyan-500" />
                                    {deck.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{participant.display_name}&apos;s Deck</p>
                            </div>
                            <button onClick={() => setShowDeckModal(false)} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {deck.deck_beys && deck.deck_beys.length > 0 ? (
                                deck.deck_beys
                                    .sort((a: any, b: any) => a.slot_number - b.slot_number)
                                    .map((bey: any) => (
                                        <div key={bey.id} className="bg-muted/50 rounded-lg p-4 space-y-2">
                                            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Bey #{bey.slot_number}</h4>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div className="bg-background rounded-md p-2 text-center">
                                                    <div className="text-muted-foreground mb-0.5">Blade</div>
                                                    <div className="font-semibold truncate">{bey.blade?.name || '—'}</div>
                                                </div>
                                                <div className="bg-background rounded-md p-2 text-center">
                                                    <div className="text-muted-foreground mb-0.5">Ratchet</div>
                                                    <div className="font-semibold truncate">{bey.ratchet?.name || '—'}</div>
                                                </div>
                                                <div className="bg-background rounded-md p-2 text-center">
                                                    <div className="text-muted-foreground mb-0.5">Bit</div>
                                                    <div className="font-semibold truncate">{bey.bit?.name || '—'}</div>
                                                </div>
                                            </div>
                                            {(bey.lock_chip || bey.assist_blade) && (
                                                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                    {bey.lock_chip && (
                                                        <div className="bg-background rounded-md p-2 text-center">
                                                            <div className="text-muted-foreground mb-0.5">Lock Chip</div>
                                                            <div className="font-semibold truncate">{bey.lock_chip.name}</div>
                                                        </div>
                                                    )}
                                                    {bey.assist_blade && (
                                                        <div className="bg-background rounded-md p-2 text-center">
                                                            <div className="text-muted-foreground mb-0.5">Assist Blade</div>
                                                            <div className="font-semibold truncate">{bey.assist_blade.name}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No beys configured in this deck.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function RegistrationSection({ tournament, participants, loading, fetchData, tournamentId, isOwner }: { tournament: any, participants: any, loading: any, fetchData: any, tournamentId: any, isOwner: boolean }) {
    const { toast } = useToast();
    const isDraft = tournament?.status === "draft";
    const isStarted = tournament?.status === "started" || tournament?.status === "completed";
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [addingPlayer, setAddingPlayer] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [showPreRegDeckModal, setShowPreRegDeckModal] = useState(false);

    async function handleToggle() {
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("is_open", isDraft ? "true" : "false");
        const res = await toggleRegistrationAction(formData);
        if (res.success) {
            toast({
                title: isDraft ? "Registration Locked" : "Registration Re-opened",
                description: isDraft ? "Configuration options are now available." : "You can add more players now.",
                variant: "success"
            });
            window.location.reload();
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
    }

    async function handleAddPlayer() {
        if (!playerName.trim()) return;
        setAddingPlayer(true);
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("name", playerName.trim());
        if (selectedUserId) formData.append("user_id", selectedUserId);
        if (selectedDeckId) formData.append("deck_id", selectedDeckId);

        const res = await addParticipantAction(formData);
        if (res?.success) {
            fetchData();
            toast({ title: "Player Added", description: `${playerName.trim()} registered successfully.`, variant: "success" });
            setSelectedUserId(null);
            setSelectedDeckId(null);
            setPlayerName("");
            setResetTrigger(prev => prev + 1);
        } else {
            toast({ title: "Registration Failed", description: parseError(res.error), variant: "destructive" });
        }
        setAddingPlayer(false);
    }

    return (
        <section className="bg-card/50 backdrop-blur-sm border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Player Management
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        {isDraft ? "Add and organize participants for the upcoming matches." : "Registration is closed for this tournament."}
                    </p>
                </div>
                {!isStarted && (
                    <button onClick={handleToggle} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm", isDraft ? "bg-background hover:bg-muted text-muted-foreground border-border" : "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent")}>
                        {isDraft ? <><Lock className="w-3.5 h-3.5" /> Lock & Prep</> : <><Unlock className="w-3.5 h-3.5" /> Unlock Registration</>}
                    </button>
                )}
            </div>

            <div className="p-8">
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="w-full lg:w-[400px] shrink-0">
                        {isDraft ? (
                            <div className="space-y-6">
                                <div className="flex p-1 bg-muted/50 rounded-lg w-full">
                                    <button onClick={() => setActiveTab('single')} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all", activeTab === 'single' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Single Entry</button>
                                    <button onClick={() => setActiveTab('bulk')} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all", activeTab === 'bulk' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Bulk Import</button>
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Player Identity</label>
                                            <UserSearchInput
                                                selectedUserId={selectedUserId}
                                                resetTrigger={resetTrigger}
                                                onSelectUser={(userId, displayName) => { setSelectedUserId(userId); setPlayerName(displayName); }}
                                                onSelectDeck={(deckId) => setSelectedDeckId(deckId)}
                                                onNameChange={(name) => { setPlayerName(name); if (!name) { setSelectedUserId(null); setSelectedDeckId(null); } }}
                                                renderAddDeckButton={() => (
                                                    <button type="button" onClick={() => setShowPreRegDeckModal(true)} className="text-[10px] bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white px-2 py-1 rounded transition-all font-bold uppercase shrink-0">
                                                        <Plus className="w-2.5 h-2.5 inline mr-1" /> Create Deck
                                                    </button>
                                                )}
                                            />
                                        </div>
                                        {showPreRegDeckModal && <AdminDeckModal isOpen={showPreRegDeckModal} onClose={() => setShowPreRegDeckModal(false)} userId={selectedUserId} playerName={playerName} onDeckCreated={(deckId) => { if (deckId) setSelectedDeckId(deckId); }} />}
                                        <button type="button" onClick={handleAddPlayer} disabled={addingPlayer || !playerName.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]">
                                            {addingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add Participant
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-2 space-y-4">
                                        <div className="p-4 border border-dashed rounded-xl bg-muted/20 text-center space-y-3">
                                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto"><Users className="w-5 h-5" /></div>
                                            <div><h4 className="text-sm font-bold">Import Multiple Players</h4><p className="text-xs text-muted-foreground mt-1 px-4">Paste a list of names to quickly populate your tournament bracket.</p></div>
                                            <BulkAddParticipantsModal tournamentId={tournamentId} refresh={fetchData} />
                                        </div>
                                    </div>
                                )}
                                {isOwner && <div className="pt-6 border-t border-dashed flex justify-center"><DebugSeedButton tournamentId={tournamentId} /></div>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!isStarted ? (
                                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg"><Lock className="w-5 h-5 text-blue-500" /></div>
                                        <div><h3 className="text-sm font-bold text-blue-500">Registration Locked</h3><p className="text-xs text-muted-foreground mt-1 leading-relaxed">Standard registration is closed to finalize seeding. Unlock if you still need to make changes.</p></div>
                                    </div>
                                ) : tournament.isRoundOne ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-center gap-3"><Play className="w-4 h-4 text-green-500 fill-current" /><h3 className="text-xs font-bold text-green-600 uppercase tracking-wider">Tournament Live</h3></div>
                                        <LateEntryForm tournamentId={tournamentId} refresh={fetchData} isCasual={!tournament?.store_id} />
                                    </div>
                                ) : (
                                    <div className="p-6 bg-muted/30 border rounded-2xl text-center"><Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-20" /><p className="text-xs text-muted-foreground italic">Registration & late entry disabled after Round 1.</p></div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 lg:border-l lg:pl-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Registered Roster <span className="ml-2 text-primary bg-primary/10 px-2 py-0.5 rounded-full">{participants.length}</span></h3>
                            {participants.length > 0 && <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-2"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Check-in Active</span></div>}
                        </div>
                        <div className="rounded-2xl border bg-muted/10 overflow-hidden"><ParticipantList participants={participants} tournamentId={tournamentId} refresh={fetchData} readOnly={false} isStarted={isStarted} /></div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function LateEntryForm({ tournamentId, refresh, isCasual = false }: { tournamentId: any, refresh: any, isCasual?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    if (!isOpen) return <div className="flex justify-end"><button onClick={() => setIsOpen(true)} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 hover:bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20 transition-all font-medium"><UserPlus className="w-3 h-3" /> Add Late Participant</button></div>;
    return (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-lg animate-in fade-in zoom-in-95 ring-1 ring-primary/20">
            <div className="flex items-center justify-between border-b pb-2"><h3 className="text-sm font-bold text-foreground flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Add Player to Round 1</h3><button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
            <p className="text-xs text-muted-foreground">This player will be immediately added to the bracket. If there is an available BYE, they will take that slot.</p>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const formData = new FormData(form); const res = await addParticipantAction(formData); if (res?.success) { form.reset(); refresh(); setIsOpen(false); toast({ title: "Player Joined", description: "Added to bracket!", variant: "success" }); } else { toast({ title: "Failed", description: parseError(res.error), variant: "destructive" }); } }} className="space-y-3">
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <div className="space-y-1"><label className="text-xs font-semibold text-muted-foreground">Player Name</label><input name="name" placeholder="Enter Player Name" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary" required autoFocus /></div>
                {!isCasual && <div className="space-y-1"><label className="text-xs font-semibold text-muted-foreground">Admin Code</label><input name="admin_pin" placeholder="••••" type="password" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary font-mono tracking-widest" required /></div>}
                <div className="flex justify-end pt-1"><button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-6 rounded-md font-bold text-sm shadow-sm">Add to Round 1</button></div>
            </form>
        </div>
    );
}

function DropPlayerModal({ isOpen, onClose, onConfirm, playerName, loading }: { isOpen: any, onClose: any, onConfirm: any, playerName: any, loading: any }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className="bg-card border rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
                <div className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2"><Ban className="w-6 h-6" /></div>
                    <h3 className="text-lg font-bold">Drop {playerName}?</h3>
                    <p className="text-sm text-muted-foreground">Are you sure? This will forfeit any active match and exclude them from future pairings.</p>
                </div>
                <div className="flex gap-2"><button onClick={onClose} disabled={loading} className="flex-1 bg-muted hover:bg-muted/80 py-2 rounded text-sm font-medium">Cancel</button><button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-2">{loading && <Loader2 className="w-3 h-3 animate-spin" />} Drop Player</button></div>
            </div>
        </div>
    );
}

function ParticipantList({ participants, tournamentId, refresh, readOnly, isStarted }: { participants: any, tournamentId: any, refresh: any, readOnly: any, isStarted?: any }) {
    return (
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {participants.length === 0 ? <div className="text-sm text-muted-foreground italic">No players added yet.</div> : participants.map((p: any, i: number) => <ParticipantRow key={p.id} participant={p} index={i} tournamentId={tournamentId} refresh={refresh} readOnly={readOnly} isStarted={isStarted} />)}
        </div>
    );
}

export function ConcludeTournamentSection({ tournamentId }: { tournamentId: any }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    async function handleConclude(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await endTournamentAction(formData);
        if (res.success) { toast({ title: "Tournament Concluded", description: "Status set to Complete.", variant: "success" }); window.location.reload(); } else { toast({ title: "Error", description: parseError(res.error), variant: "destructive" }); }
        setLoading(false);
    }
    if (!isOpen) return <button onClick={() => setIsOpen(true)} className="text-[10px] uppercase font-bold text-destructive hover:bg-destructive hover:text-white border border-destructive/30 px-3 py-1.5 rounded-lg transition-all">Conclude Tournament</button>;
    return (
        <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3 animate-in slide-in-from-top-2">
            <div><h4 className="text-sm font-bold text-destructive flex items-center gap-2"><Ban className="w-4 h-4" /> Conclude Tournament?</h4><p className="text-[11px] text-muted-foreground mt-1">This will move the tournament to <span className="font-bold">Completed</span> and lock all match scoring. This action is permanent.</p></div>
            <form onSubmit={handleConclude} className="flex gap-2 items-center pt-2">
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <input type="password" name="admin_pin" placeholder="Admin PIN" className="h-9 w-32 px-3 rounded-lg border bg-background text-sm font-mono focus:ring-2 focus:ring-destructive/20 focus:outline-none transition-all" required />
                <button type="submit" disabled={loading} className="h-9 px-4 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold hover:bg-destructive/90 transition-all flex items-center gap-2 shadow-sm">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm End"}</button>
                <button type="button" onClick={() => setIsOpen(false)} className="h-9 px-3 text-muted-foreground hover:text-foreground text-xs font-medium">Cancel</button>
            </form>
        </div>
    );
}

function DebugSeedButton({ tournamentId }: { tournamentId: any }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    async function handleSeed() {
        if (!confirm("Generate dummy players?")) return;
        setLoading(true);
        const res = await seedTournamentAction(tournamentId);
        if (res.success) { toast({ title: "Seeded", description: "Added dummy players.", variant: "success" }); window.location.reload(); } else { toast({ title: "Error", description: parseError(res.error), variant: "destructive" }); }
        setLoading(false);
    }
    return <button onClick={handleSeed} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground underline">{loading ? "Seeding..." : "Debug: Add Dummy Players"}</button>;
}

function BulkAddParticipantsModal({ tournamentId, refresh }: { tournamentId: string, refresh: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'input' | 'verify'>('input');
    const [loading, setLoading] = useState(false);
    const [bulkNames, setBulkNames] = useState("");
    const [verificationData, setVerificationData] = useState<any[]>([]);
    const [playerSelections, setPlayerSelections] = useState<Record<string, { userId: string | null, deckId: string | null }>>({});
    const [showDeckBuilderFor, setShowDeckBuilderFor] = useState<{ index: number, userId: string | null, name: string } | null>(null);
    const { toast } = useToast();

    useEffect(() => { if (!isOpen) { setStep('input'); setBulkNames(""); setVerificationData([]); setPlayerSelections({}); setLoading(false); } }, [isOpen]);

    const handleNext = async () => {
        const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n !== "");
        if (names.length === 0) return;
        setLoading(true);
        const res = await validateBulkAddAction(tournamentId, names);
        if (res.success && res.results) {
            setVerificationData(res.results);
            const defaults: any = {};
            res.results.forEach((p: any, idx: number) => { defaults[idx] = { userId: p.userId, deckId: p.decks?.[0]?.id || null }; });
            setPlayerSelections(defaults);
            setStep('verify');
        } else { toast({ title: "Validation Failed", description: res.error, variant: "destructive" }); }
        setLoading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        const participants = verificationData.filter(p => !p.isDuplicate).map((p, idx) => ({ name: p.name, userId: playerSelections[idx]?.userId, deckId: playerSelections[idx]?.deckId }));
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("participants", JSON.stringify(participants));
        const res = await bulkAddWithDecksAction(formData);
        if (res.success) { toast({ title: "Success", description: `Added ${res.count} players.`, variant: "success" }); refresh(); setIsOpen(false); } else { toast({ title: "Failed", description: parseError(res.error), variant: "destructive" }); }
        setLoading(false);
    };

    if (!isOpen) return <button onClick={() => setIsOpen(true)} className="w-full mt-2 py-2 border border-dashed rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"><Users className="w-4 h-4" /> Bulk Add Players</button>;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className={`bg-card border rounded-lg shadow-lg w-full p-6 space-y-4 animate-in zoom-in-95 ${step === 'input' ? 'max-w-md' : 'max-w-2xl'}`}>
                <div className="flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> {step === 'input' ? 'Bulk Add Players' : `Configure Players (${verificationData.length})`}</h3><button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
                {step === 'input' ? (
                    <div className="space-y-4">
                        <textarea value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} className="w-full h-48 rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-mono" placeholder={`Player One\n@username\n...`} autoFocus />
                        <div className="flex justify-end gap-2"><button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">Cancel</button><button onClick={handleNext} disabled={loading || !bulkNames.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">{loading && <Loader2 className="w-3 h-3 animate-spin" />} Next: Verify & Link</button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted text-muted-foreground uppercase sticky top-0 z-10"><tr><th className="px-4 py-2">Player</th><th className="px-4 py-2">Link</th><th className="px-4 py-2">Deck</th></tr></thead>
                                <tbody className="divide-y">
                                    {verificationData.map((p, idx) => (
                                        <tr key={idx} className={cn("hover:bg-muted/50 transition-colors", p.isDuplicate && "bg-destructive/5 hover:bg-destructive/10")}>
                                            <td className="px-4 py-3 font-medium"><div className="flex flex-col"><span>{p.name}</span>{p.isDuplicate && <span className="text-[9px] text-destructive uppercase font-bold flex items-center gap-1 mt-0.5"><Ban className="w-2 h-2" /> Already in tournament</span>}</div></td>
                                            <td className="px-4 py-3">{p.userId ? <div className="flex flex-col gap-0.5"><span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-md text-[10px] w-fit font-bold">@{p.username}</span></div> : <span className="text-muted-foreground italic text-[10px]">Manual Entry</span>}</td>
                                            <td className="px-4 py-3 min-w-[150px]"><div className="flex items-center gap-2">{p.decks?.length > 0 ? <select className="flex-1 bg-background border rounded px-2 py-1 outline-none text-[11px]" value={playerSelections[idx]?.deckId || "no_deck"} onChange={(e) => setPlayerSelections({ ...playerSelections, [idx]: { ...playerSelections[idx], deckId: e.target.value === "no_deck" ? null : e.target.value } })}><option value="no_deck">None</option>{p.decks.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select> : <span className="text-[10px] text-muted-foreground italic flex-1">No decks</span>}<button onClick={() => setShowDeckBuilderFor({ index: idx, userId: p.userId, name: p.name })} className="p-1 hover:bg-primary/20 text-primary rounded transition-colors"><Plus className="w-3.5 h-3.5" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center gap-2"><button onClick={() => setStep('input')} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md border flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button><div className="flex gap-2"><button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">Cancel</button><button onClick={handleSubmit} disabled={loading || (verificationData.length > 0 && verificationData.every(p => p.isDuplicate))} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">{loading && <Loader2 className="w-3 h-3 animate-spin" />} Add Valid Players</button></div></div>
                    </div>
                )}
                {showDeckBuilderFor && (
                    <AdminDeckModal
                        isOpen={true}
                        onClose={() => setShowDeckBuilderFor(null)}
                        userId={showDeckBuilderFor.userId}
                        playerName={showDeckBuilderFor.name}
                        onDeckCreated={(deck) => {
                            if (deck) {
                                setPlayerSelections({ ...playerSelections, [showDeckBuilderFor.index]: { ...playerSelections[showDeckBuilderFor.index], deckId: deck.id } });
                                const newData = [...verificationData];
                                if (newData[showDeckBuilderFor.index]) {
                                    newData[showDeckBuilderFor.index].decks = [...(newData[showDeckBuilderFor.index].decks || []), deck];
                                    setVerificationData(newData);
                                }
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
