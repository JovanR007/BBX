import Link from "next/link";
import { ArrowRight, Shield, ShoppingBag, Users, Gavel } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="space-y-12">
            <div className="border-b border-border/50 pb-8">
                <p className="text-sm font-medium text-primary mb-2">Legal Documentation</p>
                <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
                <p className="text-muted-foreground mt-4 text-lg max-w-2xl">
                    Welcome to BeyBracket. By accessing or using our platform, you agree to be bound by these terms.
                    Please review the specific terms that apply to your role.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Link href="/legal/terms/member" className="group p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center">
                        Member Guidelines <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        For all users creating an account, participating in tournaments, and using community features.
                    </p>
                </Link>

                <Link href="/legal/terms/store-owner" className="group p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center">
                        Store Owner Terms <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        For businesses listing their store, managing subscriptions, and hosting official events.
                    </p>
                </Link>

                <Link href="/legal/terms/organizer" className="group p-6 border rounded-xl bg-card hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Gavel className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center">
                        Organizer Rules <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        For individuals creating and managing tournaments on the platform.
                    </p>
                </Link>

                <div className="p-6 border rounded-xl bg-muted/20">
                    <div className="w-12 h-12 bg-slate-500/10 rounded-lg flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                        General Terms
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        These general terms apply to everyone.
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                        <li>You must be at least 13 years old to use the Service.</li>
                        <li>You are responsible for safeguarding your account.</li>
                        <li>We reserve the right to terminate accounts for violations.</li>
                        <li>Content must adhere to our Community Guidelines.</li>
                    </ul>
                </div>
            </div>

            <section className="space-y-4 pt-8 border-t border-border/50">
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using BeyBracket, you agree to be bound by these Terms of Service and all terms incorporated by reference. If you do not agree to all of these terms, do not use our Services.
                </p>

                <h2>2. Changes to Terms</h2>
                <p>
                    We may make changes to these Terms from time to time. If we make changes, we will provide you with notice of such changes, such as by sending an email, providing a notice through our Services or updating the date at the top of these Terms.
                </p>

                <h2>3. Contact</h2>
                <p>
                    Questions about the Terms of Service should be sent to us at <a href="mailto:support@beybracket.com" className="text-primary hover:underline">support@beybracket.com</a>.
                </p>
            </section>
        </div>
    );
}
