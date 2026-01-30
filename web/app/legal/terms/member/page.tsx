import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MemberTermsPage() {
    return (
        <div className="space-y-8">
            <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Terms
            </Link>

            <div className="border-b border-border/50 pb-8">
                <h1 className="text-3xl font-bold tracking-tight">Member Guidelines</h1>
                <p className="text-muted-foreground mt-2">
                    Specific terms for players and community members.
                </p>
            </div>

            <section className="space-y-4">
                <h2>1. Code of Conduct</h2>
                <p>
                    We strive to maintain a friendly and competitive environment. By creating an account, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Treat all other players, organizers, and store owners with respect.</li>
                    <li>Not use hate speech, harassment, or abusive language.</li>
                    <li>Not cheat, exploit bugs, or engage in match-fixing.</li>
                    <li>Respect the outcomes of matches recorded by tournament organizers.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>2. Account Responsibility</h2>
                <p>
                    You are responsible for all activity that occurs under your account. You must keep your password secure and must notify us immediately of any unauthorized use of your account.
                </p>
            </section>

            <section className="space-y-4">
                <h2>3. User Content</h2>
                <p>
                    You retain ownership of any content you post (e.g., profile pictures, comments), but you grant us a license to use, display, and distribute that content in connection with the Service. You represent and warrant that you have the rights to any content you post.
                </p>
            </section>

            <section className="space-y-4">
                <h2>4. Fair Play</h2>
                <p>
                    BeyBracket is designed for fair competition. Any attempt to manipulate rankings, falsify match results, or collude with other players is strictly prohibited and may result in a permanent ban.
                </p>
            </section>
        </div>
    );
}
