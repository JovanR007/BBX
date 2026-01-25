"use client";

import { useState, useEffect } from "react";
import { createInviteAction, getTournamentInvitesAction, deleteInviteAction } from "@/app/actions";
import { TournamentInvite } from "@/types";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";
import { Mail, Copy, Trash2, Check, Loader2, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function InviteManager({ tournamentId }: { tournamentId: string }) {
    const { toast } = useToast();
    const [invites, setInvites] = useState<TournamentInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch invites on mount
    useEffect(() => {
        loadInvites();
    }, [tournamentId]);

    async function loadInvites() {
        const res = await getTournamentInvitesAction(tournamentId);
        if (res.success && res.invites) {
            setInvites(res.invites);
        }
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setCreating(true);
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("email", email);

        const res = await createInviteAction(formData);
        if (res.success && res.invite) {
            setInvites([res.invite, ...invites]);
            setEmail("");
            toast({ title: "Invite Created", description: "Link generated successfully.", variant: "success" });
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setCreating(false);
    }

    async function handleDelete(inviteId: string) {
        if (!confirm("Revoke this invite?")) return;
        setDeletingId(inviteId);

        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("invite_id", inviteId);

        const res = await deleteInviteAction(formData);
        if (res.success) {
            setInvites(invites.filter(i => i.id !== inviteId));
            toast({ title: "Invite Revoked", variant: "success" });
        } else {
            toast({ title: "Error", description: parseError(res.error), variant: "destructive" });
        }
        setDeletingId(null);
    }

    function copyLink(token: string) {
        const url = `${window.location.origin}/t/invite/${token}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Copied!", description: "Invite link copied to clipboard." });
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" /> Tournament Invites
                </h3>

                <p className="text-sm text-muted-foreground mb-4">
                    Invite registered players to join this tournament. They will receive an in-app notification
                    and a unique link if you choose to share it. Only users with a created profile can be invited.
                </p>

                {/* Create Form */}
                <form onSubmit={handleCreate} className="flex gap-2 mb-6">
                    <input
                        type="email"
                        placeholder="player@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    />
                    <button
                        type="submit"
                        disabled={creating || !email}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 text-sm font-medium flex items-center gap-2"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite Player"}
                    </button>
                </form>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">Loading invites...</div>
                    ) : invites.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                            No invites sent yet.
                        </div>
                    ) : (
                        invites.map(invite => (
                            <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        {invite.status === 'accepted' ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : invite.status === 'declined' ? (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-yellow-500" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{invite.email}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>{new Date(invite.created_at).toLocaleDateString()}</span>
                                            <span className={cn(
                                                "capitalize px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                                invite.status === 'accepted' ? "bg-green-100 text-green-700 border-green-200" :
                                                    invite.status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                        "bg-red-100 text-red-700 border-red-200"
                                            )}>
                                                {invite.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {invite.status === 'pending' && (
                                        <button
                                            onClick={() => copyLink(invite.token)}
                                            className="text-primary hover:bg-primary/10 border border-primary/20 rounded px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                            type="button"
                                        >
                                            <Copy className="w-3 h-3" /> Copy Link
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(invite.id)}
                                        disabled={deletingId === invite.id}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5 transition-colors"
                                        type="button"
                                        title="Revoke Invite"
                                    >
                                        {deletingId === invite.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
