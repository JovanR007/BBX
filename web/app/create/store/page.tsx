"use client";

import { useActionState, useState } from "react";
import { submitStoreApplicationAction } from "@/app/actions";
import { Loader2, Store, MapPin, Phone, Mail, Layout } from "lucide-react";
import { AddressAutocomplete } from "@/components/features/address-autocomplete";
import Link from "next/link";

export default function CreateStorePage() {
    const [state, action, isPending] = useActionState(submitStoreApplicationAction, null);
    const [address, setAddress] = useState("");

    if (state?.success) {
        return (
            <div className="container mx-auto max-w-lg py-24 px-4 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Application Submitted!</h1>
                <p className="text-muted-foreground mb-8">
                    Your store application has been sent to our team for review.
                    We will notify you via email once it has been approved.
                </p>
                <Link href="/dashboard" className="btn btn-primary">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Create a Store</h1>
                <p className="text-muted-foreground">
                    Launch your official BeyBlade X store presence. Organize ranked tournaments,
                    manage your community, and climb the store leaderboards.
                </p>
            </div>

            <div className="bg-card border rounded-xl p-6 md:p-8">
                <form action={action} className="space-y-6">
                    {state?.error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                            {state.error}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                            </label>
                            <input
                                name="email"
                                type="email"
                                placeholder="store@example.com"
                                className="w-full bg-background border px-3 py-2 rounded-md"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" /> Contact Number
                            </label>
                            <input
                                name="contact"
                                placeholder="+1 234 567 8900"
                                className="w-full bg-background border px-3 py-2 rounded-md"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" /> Store Name
                        </label>
                        <input
                            name="store_name"
                            placeholder="e.g. JB Toys & Hobbies"
                            className="w-full bg-background border px-3 py-2 rounded-md"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Layout className="w-4 h-4 text-muted-foreground" /> Store Slug (Optional)
                        </label>
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">
                                beybracket.com/s/
                            </span>
                            <input
                                name="slug"
                                placeholder="jb-toys"
                                className="w-full bg-background border px-3 py-2 rounded-r-md"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave blank to auto-generate from store name.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" /> Address
                        </label>
                        <AddressAutocomplete
                            name="address"
                            placeholder="Search store address..."
                            onAddressSelect={(res) => setAddress(res.address)}
                        />
                        <input type="hidden" name="address" value={address} />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                                </>
                            ) : (
                                "Submit Application"
                            )}
                        </button>
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            By submitting, you agree to our <Link href="/legal/terms/store-owner" className="underline hover:text-foreground">Terms of Service for Store Owners</Link>.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
