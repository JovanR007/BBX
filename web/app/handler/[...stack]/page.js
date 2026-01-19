import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../lib/stack";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Handler(props) {
    const params = await props.params;
    // If the path includes 'account-settings', we use a wider container.
    // The stack param is an array, e.g., ['account-settings'] or ['sign-in']
    const isSettings = params.stack?.includes("account-settings");

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 relative">
            <div className="absolute top-4 left-4 md:top-8 md:left-8">
                <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </div>
            <div className={`w-full ${isSettings ? "max-w-5xl" : "max-w-md"}`}>
                <StackHandler app={stackServerApp} {...props} />
            </div>
        </div>
    );
}
