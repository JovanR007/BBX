"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { reportMatchAction, advanceBracketAction, addParticipantAction, startTournamentAction, updateParticipantAction, deleteParticipantAction, dropParticipantAction, toggleRegistrationAction, endTournamentAction, getTournamentDataAction, toggleCheckInAction, bulkAddParticipantsAction, seedTournamentAction, validateBulkAddAction, bulkAddWithDecksAction } from "@/app/actions";
import { ArrowLeft, CheckCircle, Users, UserPlus, Settings, Trash2, Pencil, X, Save, Lock, Unlock, Play, MonitorPlay, Loader2, Ban, Layers, Plus } from "lucide-react";
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

    // Next.js 15+ / React 19: params is a Promise
    const { id: paramId } = use(params);
    const { tournament, tournamentId, loading: tLoading, error: tError, isOwner } = useTournament(paramId);

    const [matches, setMatches] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [judges, setJudges] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // const [cutSize, setCutSize] = useState(16); // Derived from tournament object now
    const [isSeeding, setIsSeeding] = useState(false);
    // const [error, setError] = useState(null); // Use hook error
    // const [tournament, setTournament] = useState(null); // Use hook data
    const [loadingData, setLoadingData] = useState(true);
    const [showStartModal, setShowStartModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const currentlyStreamingMatch = matches.find(m => m.metadata?.streaming_judge_id);
    const { toast } = useToast();

    // Data Load
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

        const matchesData = res.matches;
        const partsData = res.participants;
        const judgesData = res.judges;

        setMatches(matchesData || []);
        setParticipants(partsData || []);
        setJudges(judgesData || []);

        // Derive Round 1 Status locally
        // Check if any match has swiss_round_number > 1
        const hasRoundTwo = matchesData ? matchesData.some(m => m.swiss_round_number > 1) : false;
        const isRoundOne = !hasRoundTwo;

        setIsRoundOne(isRoundOne);
        setLoadingData(false);
    }

    // Extended logic to handle "isRoundOne" which is dynamic and now derived
    const [isRoundOne, setIsRoundOne] = useState(true);

    // Removed the participant length check for loading because we set it false in fetchData


    if (tError) return <div className="p-8 text-center text-red-500">Error: {tError}</div>;
    if (tLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /> Loading...</div>;

    const loading = loadingData; // adapt for JSX

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href={`/t/${tournamentId}`} className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Admin Console</h1>
                <Link
                    href={`/t/${tournamentId}/projector`}
                    target="_blank"
                    className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-2 rounded-lg font-bold hover:bg-yellow-500/20 transition-all uppercase tracking-wide text-sm"
                >
                    <MonitorPlay className="w-4 h-4" /> Launch Projector
                </Link>
            </div>

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
                        ) : tournament?.status === "started" || tournament?.status === "completed" ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col gap-3 text-destructive">
                                    <div className="flex items-center gap-3">
                                        <Play className="w-5 h-5" />
                                        <div>
                                            <h3 className="font-bold text-sm">Tournament In Progress</h3>
                                            <p className="text-xs opacity-90">Settings are locked while matches are underway.</p>
                                        </div>
                                    </div>
                                    <ConcludeTournamentSection tournamentId={tournamentId} />
                                </div>
                                <div className="opacity-50 pointer-events-none">
                                    {/* Read-only view of settings */}
                                    <label className="text-sm font-medium">Top Cut Size</label>
                                    <div className="p-2 border rounded bg-muted text-sm">Top {tournament?.cut_size}</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setShowStartModal(true);
                                }} className="space-y-2">
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

                                {(() => {
                                    const uncheckedCount = participants.filter((p: any) => !p.checked_in).length;
                                    return (
                                        <ConfirmationModal
                                            isOpen={showStartModal}
                                            onClose={() => setShowStartModal(false)}
                                            title="Start Swiss Stage?"
                                            description={uncheckedCount > 0
                                                ? `⚠️ WARNING: ${uncheckedCount} players are NOT checked in. They will be REMOVED from the tournament if you proceed.`
                                                : "This will lock settings and generate the first round of matches. Are you sure you want to begin?"}
                                            confirmText={uncheckedCount > 0 ? "Remove Players & Start" : "Yes, Begin Tournament"}
                                            onConfirm={async () => {
                                                const form = document.querySelector('form[class="space-y-2"]') as HTMLFormElement; // Simple lookup for now
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
                                    );
                                })()}
                            </>
                        )}
                    </section>
                )}

                {/* General Settings */}
                <TournamentSettings tournament={tournament} judges={judges} refresh={fetchData} />

                {/* Pending Matches Section Removed as per User Request (Scoring moved to Bracket) */}

                {/* Dangerous Zone Removed as per User Request (Advance moved to Bracket) */}
            </div>
            {selectedMatch && (
                <MatchScoringModal
                    isOpen={!!selectedMatch}
                    match={selectedMatch}
                    participants={participants.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {})}
                    onClose={() => { fetchData(); setSelectedMatch(null); }}
                    refresh={fetchData}
                    ruleset={tournament?.ruleset_config}
                    cutSize={tournament?.cut_size}
                    currentlyStreamingMatchId={currentlyStreamingMatch?.id}
                />
            )}
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
    )
}

function MatchReportCard({ match, refresh }: { match: any, refresh: any }) {
    const { toast } = useToast();
    const [scoreA, setScoreA] = useState(match.score_a || 0);
    const [scoreB, setScoreB] = useState(match.score_b || 0);
    const [finish, setFinish] = useState("spin");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(formData: FormData) {
        setSubmitting(true);
        formData.append("match_id", match.id);
        formData.append("target_points", match.target_points);
        formData.append("p_a", match.participant_a_id);
        formData.append("p_b", match.participant_b_id);

        const res = await reportMatchAction(formData);
        if (res.success) {
            refresh();
            toast({ title: "Result Recorded", description: "Match score updated.", variant: "success", duration: 1500 });
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
            setSubmitting(false);
        }
    }

    return (
        <form action={handleSubmit} className="border rounded-lg bg-card p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Round {match.bracket_round} • Match {match.match_number} • Target {match.target_points}
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-primary">{match.participant_a_id ? match.participant_a_id.substring(0, 6) : "BYE"}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-primary">{match.participant_b_id ? match.participant_b_id.substring(0, 6) : "BYE"}</span>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg">
                <div className="flex flex-col items-center">
                    <label className="text-[10px] uppercase text-muted-foreground">P1</label>
                    <input name="score_a" type="number" className="w-14 h-12 text-center text-lg bg-background border rounded" value={scoreA} onChange={e => setScoreA(Number(e.target.value))} />
                </div>
                <div className="text-lg font-bold text-muted-foreground">-</div>
                <div className="flex flex-col items-center">
                    <label className="text-[10px] uppercase text-muted-foreground">P2</label>
                    <input name="score_b" type="number" className="w-14 h-12 text-center text-lg bg-background border rounded" value={scoreB} onChange={e => setScoreB(Number(e.target.value))} />
                </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-[10px] uppercase text-muted-foreground">Winning Move</label>
                <select name="finish_type" className="h-12 bg-background border rounded text-base px-2" value={finish} onChange={e => setFinish(e.target.value)}>
                    <option value="spin">Spin (1pt)</option>
                    <option value="over">Over (2pts)</option>
                    <option value="burst">Burst (2pts)</option>
                    <option value="xtreme">Xtreme (3pts)</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 rounded font-semibold text-base disabled:opacity-50 w-full md:w-auto"
            >
                {submitting ? "..." : "Submit"}
            </button>
        </form>
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
        )
    }

    return (
        <>
            <div className={`flex items-center justify-between p-2 rounded transition-colors group ${participant.dropped ? "bg-red-500/10 hover:bg-red-500/20" : "bg-muted/40 hover:bg-muted/60"}`}>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}.</span>

                    {/* Check-in Indicator */}
                    <button
                        onClick={handleToggleCheckIn}
                        disabled={loading || readOnly}
                        className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            participant.checked_in
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-muted-foreground/30 hover:border-primary"
                        )}
                        title={participant.checked_in ? "Click to Revoke Check-in" : "Click to Check-in"}
                    >
                        {participant.checked_in && <CheckCircle className="w-3 h-3" />}
                    </button>

                    <span className={`font-medium text-sm ${participant.dropped ? "text-muted-foreground line-through" : ""}`}>
                        {participant.display_name}
                    </span>
                    {participant.dropped && <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">Dropped</span>}

                    {/* Deck Badge or Add Button */}
                    {deck ? (
                        <button
                            onClick={() => setShowDeckModal(true)}
                            className="ml-1 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title={`View deck: ${deck.name}`}
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
                            <button
                                onClick={handleToggleCheckIn}
                                className="text-[10px] bg-primary/10 text-primary hover:bg-primary px-2 py-1 rounded transition-all font-bold uppercase"
                            >
                                Check In
                            </button>
                        )}
                        {!participant.user_id && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-background rounded-md transition-colors"
                                title="Edit Name"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                        {isStarted ? (
                            <button
                                onClick={() => setShowDropModal(true)}
                                className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-background rounded-md transition-colors"
                                title="Drop Player"
                            >
                                <Ban className="w-3 h-3" />
                            </button>
                        ) : (
                            <button
                                onClick={handleDelete}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-background rounded-md transition-colors"
                                title="Delete (Remove from DB)"
                            >
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

            {/* Deck Detail Modal */}
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
                                            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
                                                Bey #{bey.slot_number}
                                            </h4>
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

    // User Search State
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
                variant: "success",
                duration: 2000
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
            // Reset form
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
        <section className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {isDraft ? "Participant Registration" : "Participants Locked"}
                </h2>
                <button
                    onClick={handleToggle}
                    disabled={isStarted}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${isDraft
                        ? "bg-secondary hover:bg-secondary/80 text-secondary-foreground border-transparent"
                        : isStarted
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                            : "bg-background hover:bg-muted text-muted-foreground border-border"
                        }`}
                    title={isStarted ? "Cannot unlock: Tournament in progress" : ""}
                >
                    {isDraft ? <><Lock className="w-3 h-3" /> Lock & Configure</> : <><Unlock className="w-3 h-3" /> Unlock Registration</>}
                </button>
            </div>

            {isDraft ? (
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Add Player Form - Only in Draft */}
                    <div className="w-full md:w-1/3 space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Add Player</h3>

                        <UserSearchInput
                            selectedUserId={selectedUserId}
                            resetTrigger={resetTrigger}
                            onSelectUser={(userId, displayName, decks) => {
                                setSelectedUserId(userId);
                                setPlayerName(displayName);
                            }}
                            onSelectDeck={(deckId) => setSelectedDeckId(deckId)}
                            onNameChange={(name) => {
                                setPlayerName(name);
                                if (!name) {
                                    setSelectedUserId(null);
                                    setSelectedDeckId(null);
                                }
                            }}
                            renderAddDeckButton={(uid, pName) => (
                                <button
                                    type="button"
                                    onClick={() => setShowPreRegDeckModal(true)}
                                    className="text-[10px] bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white px-2 py-1 rounded transition-all font-bold uppercase shrink-0"
                                >
                                    <Plus className="w-2.5 h-2.5 inline mr-1" />
                                    Create Deck
                                </button>
                            )}
                        />

                        {showPreRegDeckModal && (
                            <AdminDeckModal
                                isOpen={showPreRegDeckModal}
                                onClose={() => setShowPreRegDeckModal(false)}
                                userId={selectedUserId}
                                playerName={playerName}
                                onDeckCreated={(deckId) => {
                                    if (deckId) setSelectedDeckId(deckId);
                                }}
                            />
                        )}


                        <button
                            type="button"
                            onClick={handleAddPlayer}
                            disabled={addingPlayer || !playerName.trim()}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {addingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Add Player
                        </button>

                        <p className="text-xs text-muted-foreground">
                            Type a name to add manually, or search for a registered player to link their account & deck.
                        </p>

                        <div className="pt-2">
                            <BulkAddParticipantsModal tournamentId={tournamentId} refresh={fetchData} />
                        </div>

                        {/* Debug Seed Button */}
                        <div className="pt-4 border-t border-dashed">
                            {isOwner && <DebugSeedButton tournamentId={tournamentId} />}
                        </div>
                    </div>

                    <div className="w-full md:w-2/3 border-l pl-0 md:pl-8 border-border">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                            Registered ({participants.length})
                        </h3>
                        <ParticipantList participants={participants} tournamentId={tournamentId} refresh={fetchData} readOnly={false} />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Only show confusing 'locked' message if NOT started yet (just locked for prep) */}
                    {!isStarted && (
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                            Registration is locked. Unlock to add or remove players.
                        </p>
                    )}

                    {/* Late Joiner Admin Bypass - ONLY IN ROUND 1 */}
                    {isStarted && tournament.isRoundOne && <LateEntryForm tournamentId={tournamentId} refresh={fetchData} isCasual={!tournament?.store_id} />}
                    {isStarted && !tournament.isRoundOne && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Late entry disabled after Round 1.
                        </p>
                    )}

                    <ParticipantList participants={participants} tournamentId={tournamentId} refresh={fetchData} readOnly={false} isStarted={isStarted} />
                </div>
            )}
        </section>
    );
}

function LateEntryForm({ tournamentId, refresh, isCasual = false }: { tournamentId: any, refresh: any, isCasual?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    if (!isOpen) {
        return (
            <div className="flex justify-end">
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 hover:bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20 transition-all font-medium"
                >
                    <UserPlus className="w-3 h-3" /> Add Late Participant
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-lg animate-in fade-in zoom-in-95 ring-1 ring-primary/20">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> Add Player to Round 1
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-muted-foreground">
                This player will be immediately added to the bracket.
                If there is an available BYE, they will take that slot. Otherwise, a new match will be created.
            </p>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                // Confirm action removed as per request

                const res = await addParticipantAction(formData);
                if (res?.success) {
                    form.reset();
                    refresh();
                    setIsOpen(false);
                    toast({ title: "Player Joined", description: "Added to bracket!", variant: "success" });
                } else {
                    toast({ title: "Failed", description: parseError(res.error), variant: "destructive" });
                }
            }} className="space-y-3">
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Player Name</label>
                    <input
                        name="name"
                        placeholder="Enter Player Name"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                        required
                        autoFocus
                    />
                </div>
                {/* Only show PIN field for ranked tournaments */}
                {!isCasual && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Admin Code</label>
                        <input
                            name="admin_pin"
                            placeholder="••••"
                            type="password"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary font-mono tracking-widest"
                            required
                        />
                    </div>
                )}
                <div className="flex justify-end pt-1">
                    <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-6 rounded-md font-bold text-sm shadow-sm">
                        Add to Round 1
                    </button>
                </div>
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
                    <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
                        <Ban className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold">Drop {playerName}?</h3>
                    <p className="text-sm text-muted-foreground">
                        Are you sure? This will:
                    </p>
                    <ul className="text-xs text-left text-muted-foreground list-disc pl-8 space-y-1">
                        <li>Forfeit any active match (Score 4-3 BYE).</li>
                        <li>Exclude them from future round pairings.</li>
                        <li>Mark them as "Dropped" in standings.</li>
                    </ul>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} disabled={loading} className="flex-1 bg-muted hover:bg-muted/80 py-2 rounded text-sm font-medium">Cancel</button>
                    <button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Drop Player
                    </button>
                </div>
            </div>
        </div>
    )
}

function ParticipantList({ participants, tournamentId, refresh, readOnly, isStarted }: { participants: any, tournamentId: any, refresh: any, readOnly: any, isStarted?: any }) {
    return (
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {participants.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No players added yet.</div>
            ) : participants.map((p: any, i: number) => (
                <ParticipantRow
                    key={p.id}
                    participant={p}
                    index={i}
                    tournamentId={tournamentId}
                    refresh={refresh}
                    readOnly={readOnly}
                    isStarted={isStarted}
                />
            ))}
        </div>
    )
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

        if (res.success) {
            toast({ title: "Tournament Concluded", description: "Status set to Complete.", variant: "success" });
            window.location.reload();
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="self-end text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded font-bold hover:bg-destructive/90 transition-colors"
            >
                Conclude Tournament
            </button>
        )
    }

    return (
        <div className="mt-2 p-3 bg-background/50 rounded border border-destructive/30 space-y-2 animate-in slide-in-from-top-2">
            <h4 className="text-sm font-bold text-destructive">Conclude Tournament?</h4>
            <p className="text-xs text-muted-foreground">This will move the tournament to "Past/Completed" and lock all matches.</p>
            <form onSubmit={handleConclude} className="flex gap-2 items-center">
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <input
                    type="password"
                    name="admin_pin"
                    placeholder="Admin PIN"
                    className="h-8 w-24 px-2 rounded border bg-background text-sm font-mono"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="h-8 px-3 bg-destructive text-destructive-foreground rounded text-xs font-bold hover:bg-destructive/90"
                >
                    {loading ? "..." : "Confirm"}
                </button>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-8 px-3 text-muted-foreground hover:text-foreground text-xs"
                >
                    Cancel
                </button>
            </form>
        </div>
    )
}

function DebugSeedButton({ tournamentId }: { tournamentId: any }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleSeed() {
        if (!confirm("Generate dummy players?")) return;
        setLoading(true);
        const res = await seedTournamentAction(tournamentId);
        if (res.success) {
            toast({ title: "Seeded", description: "Added dummy players.", variant: "success" });
            window.location.reload();
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    return (
        <button onClick={handleSeed} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground underline">
            {loading ? "Seeding..." : "Debug: Add Dummy Players"}
        </button>
    )
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

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('input');
            setBulkNames("");
            setVerificationData([]);
            setPlayerSelections({});
            setLoading(false);
        }
    }, [isOpen]);

    const handleNext = async () => {
        const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n !== "");
        if (names.length === 0) return;

        setLoading(true);
        const res = await validateBulkAddAction(tournamentId, names);
        if (res.success && res.results) {
            setVerificationData(res.results);
            // Default selections
            const defaults: any = {};
            res.results.forEach((p: any, idx: number) => {
                defaults[idx] = {
                    userId: p.userId,
                    deckId: p.decks?.[0]?.id || null // Default to first deck if they have one? Or "No Deck"?
                };
            });
            setPlayerSelections(defaults);
            setStep('verify');
        } else {
            toast({ title: "Validation Failed", description: res.error, variant: "destructive" });
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        const participants = verificationData
            .filter(p => !p.isDuplicate) // Filter out duplicates
            .map((p, idx) => ({
                name: p.name,
                userId: playerSelections[idx]?.userId,
                deckId: playerSelections[idx]?.deckId
            }));

        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("participants", JSON.stringify(participants));

        const res = await bulkAddWithDecksAction(formData);
        if (res.success) {
            toast({ title: "Success", description: `Added ${res.count} players.`, variant: "success" });
            refresh();
            setIsOpen(false);
        } else {
            toast({ title: "Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full mt-2 py-2 border border-dashed rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
            >
                <Users className="w-4 h-4" /> Bulk Add Players
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className={`bg-card border rounded-lg shadow-lg w-full p-6 space-y-4 animate-in zoom-in-95 ${step === 'input' ? 'max-w-md' : 'max-w-2xl'}`}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        {step === 'input' ? 'Bulk Add Players' : `Configure Players (${verificationData.length})`}
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {step === 'input' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Paste a list of names/usernames below, one per line. We'll check if they are registered users.
                        </p>
                        <textarea
                            value={bulkNames}
                            onChange={(e) => setBulkNames(e.target.value)}
                            className="w-full h-48 rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-mono"
                            placeholder={`Player One\n@username\n...`}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">Cancel</button>
                            <button
                                onClick={handleNext}
                                disabled={loading || !bulkNames.trim()}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Next: Verify & Link
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted text-muted-foreground uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2">Player</th>
                                        <th className="px-4 py-2">Link</th>
                                        <th className="px-4 py-2">Deck</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {verificationData.map((p, idx) => (
                                        <tr key={idx} className={cn("hover:bg-muted/50 transition-colors", p.isDuplicate && "bg-destructive/5 hover:bg-destructive/10")}>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex flex-col">
                                                    <span className={cn(p.isDuplicate && "text-destructive font-bold")}>{p.name}</span>
                                                    {p.isDuplicate && (
                                                        <span className="text-[9px] text-destructive uppercase font-bold flex items-center gap-1 mt-0.5">
                                                            <Ban className="w-2 h-2" /> Already in tournament
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.userId ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-md text-[10px] w-fit font-bold">@{p.username}</span>
                                                        {p.displayName && <span className="text-[10px] text-muted-foreground ml-1">{p.displayName}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-[10px]">Manual Entry</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    {p.decks?.length > 0 ? (
                                                        <select
                                                            className="flex-1 bg-background border rounded px-2 py-1 outline-none text-[11px]"
                                                            value={playerSelections[idx]?.deckId || "no_deck"}
                                                            onChange={(e) => setPlayerSelections({
                                                                ...playerSelections,
                                                                [idx]: { ...playerSelections[idx], deckId: e.target.value === "no_deck" ? null : e.target.value }
                                                            })}
                                                        >
                                                            <option value="no_deck">None</option>
                                                            {p.decks.map((d: any) => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic flex-1">No decks</span>
                                                    )}

                                                    {/* Create Deck Shortcut */}
                                                    <button
                                                        onClick={() => setShowDeckBuilderFor({ index: idx, userId: p.userId, name: p.name })}
                                                        title="Create New Deck"
                                                        className="p-1 hover:bg-primary/20 text-primary rounded transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {verificationData.some(p => p.isDuplicate) && (
                            <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded flex items-center gap-2 font-medium">
                                <Ban className="w-3 h-3" /> Heads up: Duplicate players are highlighted and will be skipped.
                            </p>
                        )}

                        <div className="flex justify-between items-center gap-2">
                            <button onClick={() => setStep('input')} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md border flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> Back
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">Cancel</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (verificationData.length > 0 && verificationData.every(p => p.isDuplicate))}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Add Valid Players
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Embedded Deck Builder Modal for the bulk flow */}
                {showDeckBuilderFor && (
                    <AdminDeckModal
                        isOpen={true}
                        onClose={() => setShowDeckBuilderFor(null)}
                        userId={showDeckBuilderFor.userId}
                        playerName={showDeckBuilderFor.name}
                        onDeckCreated={(deckId) => {
                            if (deckId) {
                                // Update selection
                                setPlayerSelections({
                                    ...playerSelections,
                                    [showDeckBuilderFor.index]: { ...playerSelections[showDeckBuilderFor.index], deckId }
                                });
                            }
                        }}
                    />
                )}
            </div>
        </div>
    )
}


