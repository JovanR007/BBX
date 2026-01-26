"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddressAutocomplete } from "@/components/features/address-autocomplete";

export default function FilterBar({ currentCity, baseUrl = "/stores" }: { currentCity: string, baseUrl?: string }) {
    const router = useRouter();
    const [resetKey, setResetKey] = useState(0);

    const handleAddressSelect = (result: any) => {
        // The component returns { address, city, country, lat, lng }
        // We prioritize the extracted city.
        const city = result.city || "";

        if (city) {
            router.push(`${baseUrl}?city=${encodeURIComponent(city)}`);
        } else if (result.address) {
            // Fallback: If no city detected but address exists, try to use the first part of address
            // This captures cases where Google doesn't return a "locality" type
            const possibleCity = result.address.split(',')[0].trim();
            router.push(`${baseUrl}?city=${encodeURIComponent(possibleCity)}`);
        } else {
            // Cleared
            router.push(baseUrl);
        }
    };

    const handleClear = () => {
        setResetKey(prev => prev + 1); // Remount to clear input
        router.push(baseUrl);
    };

    return (
        <div className="flex gap-4 max-w-2xl mx-auto flex-col md:flex-row items-center">
            <div className="flex-1 w-full relative z-20">
                <AddressAutocomplete
                    key={resetKey}
                    name="city_filter"
                    placeholder="Search by City or Address..."
                    defaultValue={currentCity === "all" ? "" : currentCity}
                    onAddressSelect={handleAddressSelect}
                />
            </div>

            {/* Clear Button - Only show if there is an active filter */}
            {currentCity && currentCity !== "all" && (
                <button
                    onClick={handleClear}
                    className="px-6 py-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 transition-all font-bold text-sm whitespace-nowrap animate-in fade-in"
                >
                    Clear Filter
                </button>
            )}
        </div>
    );
}
