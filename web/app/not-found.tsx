import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
            <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">404</h1>
            <p className="text-xl text-slate-400 mb-8">Oops! This blader page doesn't exist.</p>
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Arena
            </Link>
        </div>
    );
}
