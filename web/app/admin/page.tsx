import { getPendingApplicationsAction, approveStoreApplicationAction, rejectStoreApplicationAction } from "@/app/actions";
import { stackServerApp } from "@/lib/stack";
import { redirect } from "next/navigation";
import AdminApplicationCard from "./application-card";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
    const user = await stackServerApp.getUser();

    // Auth Check
    if (!user || user.primaryEmail !== 'shearjovan7@gmail.com') {
        // Fallback for DB role check if email doesn't match
        // But for safety/speed, let's just use the action's logic or replicate basic check here
        // The action `getPendingApplicationsAction` performs the robust check.
        // Let's call it and see if it fails.
    }

    const { success, applications, error } = await getPendingApplicationsAction();

    if (!success) {
        return (
            <div className="container mx-auto py-24 text-center">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="text-muted-foreground">{error || "You do not have permission to view this page."}</p>
                <Link href="/" className="btn btn-outline mt-4">Go Home</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to User Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Super Admin Admin</h1>
                        <p className="text-muted-foreground">Manage store applications and platform settings.</p>
                    </div>
                </div>
            </div>

            <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    Pending Applications
                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        {applications?.length || 0}
                    </span>
                </h2>

                {applications?.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-slate-800 rounded-xl text-center text-muted-foreground">
                        No pending applications. Good job!
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {applications?.map((app: any) => (
                            <AdminApplicationCard key={app.id} application={app} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
