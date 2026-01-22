import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCheckoutUrl, TIERS, TIER_LIMITS } from "@/lib/lemonsqueezy";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown, Check, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
    const user = await stackServerApp.getUser();

    if (!user) {
        redirect("/handler/sign-in");
    }

    // Get user's store
    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, name, plan, lemonsqueezy_customer_id")
        .eq("owner_id", user.id)
        .single();

    if (!store) {
        redirect("/dashboard");
    }

    const currentTier = store.plan || TIERS.FREE;
    const isPro = currentTier === TIERS.PRO;

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-4xl font-bold mb-2">Billing & Subscription</h1>
            <p className="text-muted-foreground mb-12">Manage your BeyBracket Pro subscription</p>

            {/* Current Plan */}
            <div className="bg-card border rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="text-2xl font-bold flex items-center gap-2">
                            {isPro ? (
                                <>
                                    <Crown className="w-6 h-6 text-yellow-500" />
                                    Pro
                                </>
                            ) : (
                                "Free"
                            )}
                        </p>
                    </div>
                    {isPro && (
                        <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm font-bold">
                            Active
                        </span>
                    )}
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Free Tier */}
                <div className={`border rounded-xl p-6 ${!isPro ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                    <h3 className="text-xl font-bold mb-2">Free</h3>
                    <p className="text-3xl font-black mb-4">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500" /> Up to 64 players
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500" /> Unlimited tournaments
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500" /> Swiss & Elimination brackets
                        </li>
                    </ul>
                    {!isPro && (
                        <div className="text-center text-sm text-muted-foreground">Current plan</div>
                    )}
                </div>

                {/* Pro Tier */}
                <div className={`border rounded-xl p-6 bg-gradient-to-br from-yellow-500/10 to-transparent ${isPro ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-yellow-500/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">Pro</h3>
                        <Crown className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="text-3xl font-black mb-4">$15<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> Unlimited players
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> Custom branding
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> CSV data export
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> Priority support
                        </li>
                    </ul>
                    {isPro ? (
                        <div className="text-center text-sm text-yellow-500 font-bold">Current plan</div>
                    ) : (
                        <form action={async () => {
                            "use server";
                            const checkoutUrl = await createCheckoutUrl(
                                user.id,
                                user.primaryEmail || "",
                                store.id
                            );
                            if (checkoutUrl) {
                                redirect(checkoutUrl);
                            }
                        }}>
                            <button
                                type="submit"
                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors"
                            >
                                Upgrade to Pro
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* FAQ */}
            <div className="mt-12">
                <h2 className="text-xl font-bold mb-4">FAQ</h2>
                <div className="space-y-4 text-sm text-muted-foreground">
                    <div>
                        <p className="font-medium text-foreground">Can I cancel anytime?</p>
                        <p>Yes, you can cancel your subscription at any time. You'll retain Pro features until the end of your billing period.</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">What payment methods are accepted?</p>
                        <p>We accept all major credit cards, PayPal, and more through our payment partner LemonSqueezy.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
