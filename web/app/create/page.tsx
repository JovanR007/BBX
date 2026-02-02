"use client";

export const dynamic = "force-dynamic";

import { createTournamentAction } from "@/app/actions";
import { ArrowLeft, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AddressAutocomplete } from "@/components/features/address-autocomplete";
import { DateTimePicker } from "@/components/features/date-time-picker";

export default function CreateTournamentPage() {
    const [loading, setLoading] = useState(false);

    return (
        <div className="container mx-auto px-4 py-16 max-w-lg">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Link>

            <div className="bg-card border rounded-xl p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Rocket className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Host a Tournament</h1>
                </div>

                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    const formData = new FormData(e.currentTarget);
                    try {
                        const res = await createTournamentAction(formData);
                        if (res?.error) {
                            alert("Error: " + res.error);
                            setLoading(false);
                        }
                    } catch (err) {
                        // Ignore redirect errors
                    }
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tournament Name</label>
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="e.g. Week 1 Local Store Championship"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Battle Format</label>
                            <select
                                name="battle_type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                defaultValue="3on3"
                            >
                                <option value="3on3">3on3 Battle (Official)</option>
                                <option value="1on1">1on1 Battle</option>
                                <option value="counter">Counter Battle</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Win Condition</label>
                            <select
                                name="match_type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                defaultValue="4pt"
                            >
                                <option value="4pt">4-Point Match (Official)</option>
                                <option value="5pt">5-Point Match (WBO Swiss)</option>
                                <option value="7pt">7-Point Match (WBO Finals)</option>
                                <option value="best_of_3">Best of 3 Sets [4pts]</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Venue / Location</label>
                            {/* Replaced native input with Autocomplete */}
                            <AddressAutocomplete
                                name="location"
                                required
                                placeholder="Search venue name or address..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Time</label>
                            <DateTimePicker
                                name="start_time"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded font-semibold text-sm disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Launch Tournament"}
                    </button>
                </form>
            </div>
        </div>
    )
}
