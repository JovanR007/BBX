"use client";

import { useUser } from "@stackframe/stack";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { createProfileAfterSignupAction, registerWithUsernameAction } from "../auth-actions"; // Reuse logic or similar
import { useToast } from "@/components/ui/toaster";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
    const user = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;

        // Use existing action to check username availability
        // We pass dummy email/pass because the action expects them, OR we create a specific checks action.
        // Let's rely on `createProfileAfterSignupAction` but we should check username first.
        // Actually `registerWithUsernameAction` does too much (validates email etc).
        // Let's do a direct Supabase check here or use a new action.

        try {
            // Quick uniqueness check via Supabase Client (RLS allows select usually?)
            // RLS for profiles might be public read.
            const { data: existing } = await supabase
                .from("profiles")
                .select("id")
                .ilike("username", username)
                .single();

            if (existing) {
                toast({ title: "Username taken", description: "Please choose another.", variant: "destructive" });
                setLoading(false);
                return;
            }

            // Create Profile
            const res = await createProfileAfterSignupAction(username, user.primaryEmail || "");

            if (!res.success) {
                // If the error suggests username taken, we specifically highlight it.
                if (res.error?.includes("taken")) {
                    toast({ title: "Username Unavailable", description: res.error, variant: "destructive" });
                } else {
                    toast({ title: "Error", description: res.error, variant: "destructive" });
                }
            } else {
                toast({ title: "Profile Created", description: "Welcome to the arena!", variant: "success" });
                router.push("/dashboard");
                router.refresh();
            }

        } catch (error: any) {
            console.error("Onboarding Error:", error);
            toast({ title: "Error", description: "Failed to setup profile.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] opacity-40 z-0" />

            <div className="w-full max-w-lg bg-slate-950/80 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-6 rotate-3 hover:rotate-6 transition-transform">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Final Step</h1>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Choose a unique username to complete your registration. This will be your identity in tournaments.
                </p>

                <form onSubmit={handleSubmit} className="text-left max-w-sm mx-auto space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Username</label>
                        <input
                            name="username"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all text-center text-lg tracking-wide font-bold"
                            placeholder="BladerName"
                            required
                            pattern="[a-zA-Z0-9_]{3,20}"
                            minLength={3}
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 text-center">3-20 characters, alphanumeric.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-slate-950 hover:bg-slate-200 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}
