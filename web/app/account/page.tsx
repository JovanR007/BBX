import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProfileEditor from "@/app/dashboard/profile-editor";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
    const user = await stackServerApp.getUser();

    if (!user) {
        redirect("/handler/sign-in");
    }

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <div className="mb-6">
                <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-full">
                    <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your public profile and preferences.</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-semibold mb-6">Public Profile</h2>
                <ProfileEditor user={{ id: user.id }} />
            </div>
        </div>
    );
}
