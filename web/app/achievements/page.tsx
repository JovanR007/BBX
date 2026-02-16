
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stackServerApp } from "@/lib/stack";
import { AchievementsList } from "@/components/achievements/achievements-list";
import { User, Trophy, Medal } from "lucide-react";
import Link from "next/link";
import { calculateUserStats } from "@/lib/achievements"; // Implementation pending

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
    const user = await stackServerApp.getUser();

    // 1. Fetch All Badges
    const { data: badges } = await supabaseAdmin
        .from("badges")
        .select("*")
        .order("target_value", { ascending: true }); // Simplistic sort initially

    let userBadges: any[] = [];
    let userStats: any = {};

    if (user) {
        // 2. Fetch User's Earned Badges
        const { data: earned } = await supabaseAdmin
            .from("user_badges")
            .select("*")
            .eq("user_id", user.id);

        userBadges = earned || [];

        // 3. Fetch User Progress Stats
        // We will create a helper for this: calculateUserStats(userId)
        userStats = await calculateUserStats(user.id);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
            {/* Header */}
            <div className="bg-slate-900 border-b border-white/10 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />

                <div className="container mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-white/10 shadow-2xl backdrop-blur-sm">
                            <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <div className="text-center md:text-left space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic">
                                Hall of Fame
                            </h1>
                            <p className="text-slate-400 font-medium max-w-xl mx-auto md:mx-0">
                                Track your journey to becoming a Beyblade Legend. Earn badges, complete challenges, and show off your achievements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {!user && (
                    <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Sign in to track your progress</h3>
                        <p className="text-slate-400 mb-4">You are viewing the global achievement list. Sign in to see what you've unlocked!</p>
                        <Link href="/sign-in" className="inline-flex items-center gap-2 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors">
                            <User className="w-4 h-4" /> Sign In / Sign Up
                        </Link>
                    </div>
                )}

                <AchievementsList
                    badges={badges || []}
                    userBadges={userBadges}
                    userStats={userStats}
                />
            </div>
        </div>
    );
}
