"use client";

import { useState } from "react";
import { addJudgeAction } from "@/app/actions";
import { Gavel, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { parseError } from "@/lib/errors";

export function JudgeJoin({ tournamentId }: { tournamentId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    async function handleJoin(e: any) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("code", code);

        const res = await addJudgeAction(formData);

        if (res.success) {
            toast({ title: "Joined as Judge", description: res.message || "You can now score matches!", variant: "success" });
            setIsOpen(false);
            window.location.reload(); // Reload to update permissions/UI
        } else {
            toast({ title: "Join Failed", description: parseError(res.error), variant: "destructive" });
        }
        setLoading(false);
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-4 underline decoration-dotted"
            >
                <Gavel className="w-3 h-3" /> Judge Access
            </button>
        );
    }

    return (
        <div className="mt-4 p-4 bg-card border rounded-lg shadow-sm max-w-sm w-full animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                <Gavel className="w-4 h-4 text-primary" /> Enter Judge Code
            </h4>
            <form onSubmit={handleJoin} className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="E.g. BEY123"
                    className="flex-1 h-9 px-3 rounded-md border text-sm font-mono uppercase"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={loading || !code}
                    className="bg-primary text-primary-foreground h-9 px-3 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                </button>
            </form>
            <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground mt-2 hover:text-foreground"
            >
                Cancel
            </button>
        </div>
    );
}
