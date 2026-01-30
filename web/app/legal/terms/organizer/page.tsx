import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function OrganizerTermsPage() {
    return (
        <div className="space-y-8">
            <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Terms
            </Link>

            <div className="border-b border-border/50 pb-8">
                <h1 className="text-3xl font-bold tracking-tight">Organizer Rules</h1>
                <p className="text-muted-foreground mt-2">
                    Guidelines for hosting tournaments on BeyBracket.
                </p>
            </div>

            <section className="space-y-4">
                <h2>1. Organizer Responsibilities</h2>
                <p>
                    As a Tournament Organizer, you are the face of the competition. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Run tournaments fairly and impartially.</li>
                    <li>Enforce the rules of the game (Beyblade X Official Rulebook) unless explicitly stated as a custom format.</li>
                    <li>Resolve disputes between players quickly and respectfully.</li>
                    <li>Ensure the safety and well-being of all participants.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>2. Result Reporting</h2>
                <p>
                    You are solely responsible for entering accurate match results into the Platform. Falsifying results to boost specific players' rankings is a severe violation and will result in a permanent ban.
                </p>
            </section>

            <section className="space-y-4">
                <h2>3. Prizes and Fees</h2>
                <p>
                    If you charge entry fees or offer prizes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>You must clearly communicate the prize structure before the tournament begins.</li>
                    <li>You are solely responsible for distributing prizes to winners. BeyBracket is not responsible for undelivered prizes.</li>
                    <li>You must comply with all local laws and regulations regarding gambling and raffles.</li>
                </ul>
            </section>
        </div>
    );
}
