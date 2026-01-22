import { stackServerApp } from "../../lib/stack";
import AdminForm from "./form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const user = await stackServerApp.getUser();
    const email = user?.primaryEmail;

    // Override for hardcoded superadmin
    const isSuper = email === 'shearjovan7@gmail.com' || email === process.env.SUPERADMIN_EMAIL;

    if (!isSuper) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold text-red-500">Unauthorized Access</h1>
                <p className="text-muted-foreground">You are not logged in as the Superadmin.</p>
                <Link href="/" className="text-primary hover:underline">Return Home</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 max-w-2xl">
            <div className="mb-6">
                <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </div>

            <h1 className="text-3xl font-bold mb-8">Superadmin Dashboard</h1>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Provision New Store</h2>
                <AdminForm />
            </div>
        </div>
    );
}
