import { stackServerApp } from "@/lib/stack";
import { getStoreLeagueAction } from "@/app/actions";
import { StoreLeagueTable } from "@/components/features/league-table";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeagueDashboardPage() {
    const user = await stackServerApp.getUser();
    if (!user) redirect("/handler/sign-in");

    // Default to current year
    const year = new Date().getFullYear();
    const result = await getStoreLeagueAction(year);

    if (!result.success) {
        // Handle error (e.g. not pro)
        return (
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
                    <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">{result.error}</p>
                    <div className="mt-8">
                        <Link href="/dashboard/billing" className="bg-primary text-black font-bold py-2 px-4 rounded-lg">Upgrade to Pro</Link>
                    </div>
                </div>
            </div>
        );
    }

    const players = result.data || [];

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Store League</h1>
                    <p className="text-muted-foreground">
                        Your local leaderboard calculated automatically from tournament results.
                    </p>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                    PRO FEATURE
                </div>
            </div>

            <StoreLeagueTable players={players} year={year} />
        </div>
    );
}
