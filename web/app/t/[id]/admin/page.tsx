"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { reportMatchAction, advanceBracketAction, addParticipantAction, startTournamentAction, updateParticipantAction, deleteParticipantAction, dropParticipantAction, toggleRegistrationAction, endTournamentAction, getTournamentDataAction, toggleCheckInAction } from "@/app/actions";
import { ArrowLeft, CheckCircle, Users, UserPlus, Settings, Trash2, Pencil, X, Save, Lock, Unlock, Play, MonitorPlay, Loader2, Ban } from "lucide-react";
import TournamentSettings from "./tournament-settings";
import { ConfirmationModal } from "@/components/ui/modal";
import { MatchScoringModal } from "@/components/features/match-scoring-modal";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { useTournament } from "@/hooks/use-tournament";

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
    const [selectedMatch, setSelectedMatch] = useState(null);
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
                                                {[4, 8, 16, 32, 64]
                                                    .filter(size => size <= participants.length)
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
                                        Options limited by player count ({participants.length}).
                                    </p>
                                </form>

                                <ConfirmationModal
                                    isOpen={showStartModal}
                                    onClose={() => setShowStartModal(false)}
                                    title="Start Swiss Stage?"
                                    description="This will lock settings and generate the first round of matches. Are you sure you want to begin?"
                                    confirmText="Yes, Begin Tournament"
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
                            </>
                        )}
                    </section>
                )}

                {/* General Settings */}
                <TournamentSettings tournament={tournament} judges={judges} refresh={fetchData} />

                {/* Pending Matches Section Removed as per User Request (Scoring moved to Bracket) */}

                {/* Dangerous Zone Removed as per User Request (Advance moved to Bracket) */}
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
        </>
    );
}

function RegistrationSection({ tournament, participants, loading, fetchData, tournamentId, isOwner }: { tournament: any, participants: any, loading: any, fetchData: any, tournamentId: any, isOwner: boolean }) {
    const { toast } = useToast();
    const isDraft = tournament?.status === "draft";
    const isStarted = tournament?.status === "started" || tournament?.status === "completed";

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
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">New Player</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const formData = new FormData(form);
                            const res = await addParticipantAction(formData);
                            if (res?.success) {
                                form.reset();
                                fetchData();
                                toast({ title: "Player Added", description: "Successfully registered new participant.", variant: "success" });
                            } else {
                                toast({ title: "Registration Failed", description: parseError(res.error), variant: "destructive" });
                            }
                        }} className="flex gap-2">
                            <input type="hidden" name="tournament_id" value={tournamentId} />
                            <input
                                name="name"
                                placeholder="Enter Name"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                                required
                            />
                            <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 flex items-center justify-center rounded-md">
                                <UserPlus className="w-4 h-4" />
                            </button>
                        </form>
                        <p className="text-xs text-muted-foreground">
                            Add all players here before locking.
                        </p>

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
                    {isStarted && tournament.isRoundOne && <LateEntryForm tournamentId={tournamentId} refresh={fetchData} />}
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

function LateEntryForm({ tournamentId, refresh }: { tournamentId: any, refresh: any }) {
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
        if (!confirm("Add 64 Test Players? This cannot be easily undone manually.")) return;
        setLoading(true);
        // Dynamic import to avoid server action import issues in client component if strictly separated
        const { seedTournamentAction } = await import("@/app/actions");
        const res = await seedTournamentAction(tournamentId, 64);
        setLoading(false);

        if (res.success) {
            toast({ title: "Seeded 64 Players", description: "Ready for testing within limits.", variant: "success" });
            window.location.reload();
        } else {
            toast({ title: "Seed Failed", description: res.error, variant: "destructive" });
        }
    }

    return (
        <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full py-2 text-xs font-mono text-muted-foreground hover:text-foreground border border-dashed rounded hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
        >
            <Users className="w-3 h-3" />
            {loading ? "Seeding..." : "Debug: Add 64 Test Players"}
        </button>
    )
}
