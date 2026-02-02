import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function StoreOwnerTermsPage() {
    return (
        <div className="space-y-8">
            <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Terms
            </Link>

            <div className="border-b border-border/50 pb-8">
                <h1 className="text-3xl font-bold tracking-tight">Terms for Store Owners</h1>
                <p className="text-muted-foreground mt-2">
                    Additional terms for businesses using BeyBracket.
                </p>
            </div>

            <section className="space-y-4">
                <h2>1. Store Verification</h2>
                <p>
                    By applying for a Verified Store account, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>You are an authorized representative of the business.</li>
                    <li>The business is a legal entity capable of entering into contracts.</li>
                    <li>The information provided in your application is accurate and up-to-date.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>2. Hosting Events</h2>
                <p>
                    As a Store Owner, you may host official ranked tournaments. You are responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Providing a safe and suitable venue for events.</li>
                    <li>Ensuring events are run fairly and in accordance with Organizer Rules.</li>
                    <li>Accurately reporting results to the Platform.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>3. Subscriptions and billing</h2>
                <p>
                    Certain features for Store Owners may require a paid subscription.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Billing Cycle:</strong> Subscriptions are billed in advance on a recurring basis.</li>
                    <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your dashboard. Access will continue until the end of the current billing period.</li>
                    <li><strong>Refunds:</strong> Refunds are generally not provided for partial billing periods, but exceptions may be made at our discretion.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>4. Modifications and Termination</h2>
                <p>
                    We reserve the right to modify or terminate the Store Program at any time. We may also revoke Verified Store status for violations of these Terms or the General Terms of Service.
                </p>
            </section>
        </div>
    );
}
