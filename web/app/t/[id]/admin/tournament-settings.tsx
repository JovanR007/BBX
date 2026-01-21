"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTournamentAction, deleteTournamentAction, removeJudgeAction } from "@/app/actions";
import { Settings, Save, Trash2, AlertTriangle, Loader2, Users, X } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import { ConfirmationModal } from "@/components/ui/modal";

export default function TournamentSettings({ tournament, judges = [], refresh }: { tournament: any, judges?: any[], refresh: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState(tournament.name);
    const [judgeCode, setJudgeCode] = useState(tournament.judge_code || "");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append("tournament_id", tournament.id);
        formData.append("name", name);
        formData.append("judge_code", judgeCode);

        const res = await updateTournamentAction(formData);

        if (res.success) {
            toast({ title: "Settings Saved", description: "Tournament updated successfully.", variant: "success" });
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
        <section className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> General Settings
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tournament Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Judge Code</label>
                    <div className="flex gap-2">
                        <input
                            value={judgeCode}
                            onChange={e => setJudgeCode(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase tracking-widest"
                            placeholder="Set Code"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        Share this code with judges. They can enter it on the tournament page to get scoring access.
                    </p>
                </div>

                {/* Judge List */}
                <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" /> Active Judges ({judges.length})
                    </label>
                    <div className="border rounded-md bg-muted/20 p-2 space-y-2 max-h-40 overflow-y-auto">
                        {judges.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic">No judges yet.</div>
                        ) : judges.map(j => (
                            <div key={j.user_id} className="flex items-center justify-between bg-card p-2 rounded text-xs border">
                                <span className="font-mono">{j.user_id.substring(0, 8)}...</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveJudge(j.user_id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 text-sm font-medium flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-3 h-3 animate-spin" />} Save Changes
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-8 border-t border-destructive/20">
                <h3 className="text-sm font-bold text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Deleting a tournament is irreversible. All matches and results will be lost.
                </p>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    type="button"
                    className="border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded px-4 py-2 text-sm font-medium transition-colors"
                >
                    Delete Tournament
                </button>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => !deleting && setShowDeleteModal(false)}
                title="Delete Tournament?"
                description="This action cannot be undone. Are you absolutely sure?"
                confirmText={deleting ? "Deleting..." : "Yes, Delete Everything"}
                onConfirm={handleDelete}
                variant="destructive"
                isLoading={deleting}
            />
        </section>
    );
}
