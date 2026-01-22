"use client";

import { useStackApp } from "@stackframe/stack";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Mail, Lock, User } from "lucide-react";
import { registerWithUsernameAction, createProfileAfterSignupAction } from "../auth-actions";
import { useToast } from "@/components/ui/toaster";

export default function SignUpPage() {
    const stackApp = useStackApp();
    const router = useRouter();
    const { toast } = useToast();

    // Form State
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"details" | "creating">("details");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        // 1. Client-Side Stack Registration
        try {
            const res = await stackApp.signUpWithCredential({ email, password });

            if (res.status === "error") {
                toast({ title: "Registration Failed", description: res.error.message, variant: "destructive" });
            } else {
                // 2. Success - Authenticated
                // The AuthGuard will detect missing profile and redirect to /onboarding automatically
                setStep("creating");
                router.push("/dashboard");
            }

        } catch (error: any) {
            console.error("Stack Registration Error:", error);
            toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
        } finally {
            setLoading(false);
        }


    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-900 via-background to-background z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-40 z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] opacity-30 z-0" />

            <div className="w-full max-w-md bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 border border-primary/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                        Begin Journey
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Create your blader profile today</p>
                </div>

                {step === "details" ? (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => stackApp.signInWithOAuth("google")}
                            className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 mb-4"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Sign Up with Google
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-950 px-2 text-slate-500">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email</label>
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

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type="password"
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 pl-10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign Up"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-primary animate-spin" />
                            <UserPlus className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Setting up your profile...</h3>
                        <p className="text-slate-400 text-sm">Forging your blader identity.</p>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
