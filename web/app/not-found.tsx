import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <div className="bg-red-500/10 p-4 rounded-full mb-6">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                The beyblade you are looking for has been knocked out of the arena.
            </p>
            <Link
                href="/"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold hover:bg-primary/90 transition-colors"
            >
                Return to Stadium
            </Link>
        </div>
    );
}
