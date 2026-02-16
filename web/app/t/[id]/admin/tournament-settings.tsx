"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTournamentAction, deleteTournamentAction, removeJudgeAction } from "@/app/actions";
import { Settings, Save, Trash2, AlertTriangle, Loader2, Users, X } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import { ConfirmationModal } from "@/components/ui/modal";
import { InviteManager } from "@/components/features/invite-manager";


export default function TournamentSettings({ tournament, judges = [], refresh }: { tournament: any, judges?: any[], refresh: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState(tournament.name);
    const [judgeCode, setJudgeCode] = useState(tournament.judge_code || "");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        setLoading(true);
        const formData = new FormData(form); // Use form data captured at start
        formData.append("tournament_id", tournament.id);
        // name and judge_code already in form if using inputs, but let's be explicit if using state
        // actually easier to just use standard FormData from event since we added a name="cut_size" select

        // Manual appends for state-controlled inputs if needed, or ensuring they have name attributes
        // Let's ensure the state vars are still used or sync'd.
        // Re-appending explicit state to override form defaults just in case
        formData.set("name", name);
        formData.set("judge_code", judgeCode);

        const res = await updateTournamentAction(formData);

        if (res.success) {
            toast({ title: "Settings Saved", description: "Tournament updated successfully.", variant: "success" });
            if (refresh) refresh();
        } else {
            toast({ title: "Update Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    async function handleDelete() {
        setDeleting(true);
        const res = await deleteTournamentAction(tournament.id);
        if (res.success) {
            toast({ title: "Tournament Deleted", description: "Redirecting to dashboard...", variant: "success" });
            router.push("/dashboard");
        } else {
            toast({ title: "Delete Failed", description: parseError(res.error), variant: "destructive" });
            setDeleting(false);
            setShowDeleteModal(false);
        }
    }



    async function handleRemoveJudge(judgeId: string) {
        if (!confirm("Remove this judge?")) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("tournament_id", tournament.id);
        formData.append("user_id", judgeId);

        const res = await removeJudgeAction(formData);
        if (res.success) {
            toast({ title: "Judge Removed", variant: "success" });
            if (refresh) refresh();
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    return (
        <section className="bg-card/50 backdrop-blur-sm border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Tournament Configuration
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Manage tournament details, judge access, and invitations.</p>
                </div>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: General Info */}
                    <div className="space-y-8">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Tournament Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            {tournament.is_ranked && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Judge Authorization Code</label>
                                    <input
                                        value={judgeCode}
                                        onChange={e => setJudgeCode(e.target.value)}
                                        className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm font-mono uppercase tracking-[0.2em] focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                        placeholder="SET CODE"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic px-1">
                                        Share this code with your staff. Judges enter it on the public page for scoring access.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </form>

                        <div className="pt-8 border-t border-dashed space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> Bracket Settings
                            </h3>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Top Cut Size</label>
                                <select
                                    name="cut_size"
                                    className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                    defaultValue={tournament.cut_size || 16}
                                >
                                    {[4, 8, 16, 32, 64].map(size => (
                                        <option key={size} value={size}>Top {size}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground italic px-1">
                                    Number of players advancing to the elimination bracket.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-dashed">
                            <h3 className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Danger Zone
                            </h3>
                            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
                                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                    Deleting this tournament is <span className="text-destructive font-bold uppercase">permanent</span>. All match records, registered participants, and results will be purged from the database.
                                </p>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    type="button"
                                    className="w-full border border-destructive/30 text-destructive hover:bg-destructive hover:text-white rounded-xl py-2.5 text-xs font-bold transition-all"
                                >
                                    Delete Tournament
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Judge & Invite Management */}
                    <div className="space-y-8">
                        {tournament.is_ranked && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Active Judges</label>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{judges.length} Active</span>
                                </div>
                                <div className="border rounded-2xl bg-muted/20 overflow-hidden divide-y divide-border/50">
                                    {judges.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-muted-foreground italic">No judges have authorized yet.</div>
                                    ) : judges.map(j => (
                                        <div key={j.user_id} className="flex items-center justify-between bg-card/30 p-3 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                                    {(j.display_name || j.username || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="text-xs font-bold truncate">{j.display_name || j.username}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">ID: {j.user_id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveJudge(j.user_id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                title="Revoke Access"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Invite Links</label>
                            <InviteManager tournamentId={tournament.id} />
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => !deleting && setShowDeleteModal(false)}
                title="Delete Tournament?"
                description="This action is irreversible. All data including match records and participant brackets will be destroyed permanently."
                confirmText={deleting ? "Deleting..." : "Yes, Delete Everything"}
                onConfirm={handleDelete}
                variant="destructive"
                isLoading={deleting}
            />
        </section>
    );
}
