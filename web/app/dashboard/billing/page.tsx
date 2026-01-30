import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCheckoutUrl, TIERS, TIER_LIMITS } from "@/lib/lemonsqueezy";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown, Check, Zap, X, MapPin, Store, User } from "lucide-react";
import { UpgradeButton } from "@/components/billing/upgrade-button";

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
        return (
            <div className="container mx-auto px-4 py-12 max-w-6xl">
                <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
                        Choose Your Path
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Whether you're just starting your journey or running a premier hobby shop,
                        BeyBracket has the tools you need to succeed.
                    </p>
                </div>

                {/* Comparison Table */}
                <div className="relative w-full overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm shadow-2xl mb-12">
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            {/* Header */}
                            <div className="grid grid-cols-4 divide-x border-b bg-muted/40 p-4">
                                <div className="p-4 flex items-center font-semibold text-muted-foreground">Features</div>
                                <div className="p-4 flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                                        <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div className="font-bold text-lg">Member</div>
                                    <div className="text-sm text-muted-foreground">Personal Use</div>
                                </div>
                                <div className="p-4 flex flex-col items-center gap-2 bg-primary/5 -my-4 pt-8">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Store className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="font-bold text-lg text-primary">Store Owner</div>
                                    <div className="text-sm text-primary/80">Grow Your Scene</div>
                                </div>
                                <div className="p-4 flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                        <Crown className="w-6 h-6 text-yellow-500" />
                                    </div>
                                    <div className="font-bold text-lg text-yellow-500">Pro Store</div>
                                    <div className="text-sm text-yellow-500/80">Maximum Power</div>
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y text-sm">
                                {[
                                    { label: "Cost", member: "Free", store: "Free", pro: "$15/mo" },
                                    { label: "Player Capacity", member: "32 Players", store: "64 Players", pro: <span className="text-yellow-500 font-bold">Unlimited</span> },
                                    { label: "Event Types", member: "Unranked Only", store: "Ranked Events", pro: "Ranked Events" },
                                    { label: "League Standings", member: <X className="w-5 h-5 text-red-500/50 mx-auto" />, store: <X className="w-5 h-5 text-red-500/50 mx-auto" />, pro: <div className="flex items-center justify-center gap-1 text-green-500 font-bold"><Check className="w-4 h-4" /> Automated</div> },
                                    { label: "Store Profile", member: <X className="w-5 h-5 text-red-500/50 mx-auto" />, store: "Standard Page", pro: <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold"><Crown className="w-4 h-4 fill-current" /> Verified</div> },
                                    { label: "Support", member: "Community", store: "Standard", pro: <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold"><Zap className="w-4 h-4 fill-current" /> Priority</div> },
                                ].map((row, i) => (
                                    <div key={i} className="grid grid-cols-4 divide-x hover:bg-muted/30 transition-colors">
                                        <div className="p-4 py-6 font-medium text-muted-foreground flex items-center">{row.label}</div>
                                        <div className="p-4 py-6 text-center font-medium flex items-center justify-center">{row.member}</div>
                                        <div className="p-4 py-6 text-center font-bold text-foreground bg-primary/5 flex items-center justify-center">{row.store}</div>
                                        <div className="p-4 py-6 text-center font-bold text-white flex items-center justify-center">{row.pro}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <p className="text-muted-foreground">Ready to take your local scene to the next level?</p>
                    <Link
                        href="/create/store"
                        className="bg-primary text-black font-black text-lg py-4 px-12 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:scale-105 transition-all"
                    >
                        Create Your Store
                    </Link>
                    <p className="text-xs text-muted-foreground">Requires store verification. Terms apply.</p>
                </div>
            </div>
        );
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
                            <Zap className="w-4 h-4 text-yellow-500" /> Automated League Standings
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> Verified Store Badge
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" /> Priority support
                        </li>
                    </ul>
                    {isPro ? (
                        <div className="text-center text-sm text-yellow-500 font-bold">Current plan</div>
                    ) : (
                        <UpgradeButton price="$15/month" />
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
