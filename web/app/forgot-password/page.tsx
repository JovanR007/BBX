"use client";

import { useStackApp } from "@stackframe/stack";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export default function ForgotPasswordPage() {
    const stackApp = useStackApp(); // Assuming this works for consistency, but will check methods
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        try {
            const res = await stackApp.sendForgotPasswordEmail(email);

            if (res.status === "error") {
                toast({ title: "Error", description: res.error.message, variant: "destructive" });
            } else {
                setSent(true);
                toast({ title: "Email Sent", description: "Password reset link sent to your inbox", variant: "success" });
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to send email", variant: "destructive" });
        } finally {
            setLoading(false);
        }


    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background z-0" />

            <div className="w-full max-w-md bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 border border-primary/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                        Reset Password
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">We'll send you a link to restore access</p>
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                                <input
                                    name="email"
                                    type="email"
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 pl-10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Send Reset Link"}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-6">
                        <div className="bg-green-500/10 text-green-400 p-4 rounded-lg border border-green-500/20 mb-4">
                            <p className="font-semibold">Email Sent!</p>
                            <p className="text-sm opacity-90">Check your inbox for further instructions.</p>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <Link href="/sign-in" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
