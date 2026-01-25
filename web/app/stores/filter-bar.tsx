"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getCountriesAction, getStatesAction, getCitiesAction } from "@/app/location-actions";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function FilterBar({ currentCity }: { currentCity: string }) {
    const router = useRouter();

    // Data State
    const [countries, setCountries] = useState<{ name: string, code: string }[]>([]);
    const [states, setStates] = useState<{ name: string, code: string }[]>([]);
    const [cities, setCities] = useState<{ name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Selection State
    const [selectedCountryCode, setSelectedCountryCode] = useState("");
    const [selectedStateCode, setSelectedStateCode] = useState("");
    const [selectedCity, setSelectedCity] = useState(currentCity || "");
    const [openCountry, setOpenCountry] = useState(false);

    // 1. Fetch Countries on Mount
    useEffect(() => {
        getCountriesAction().then(setCountries);
    }, []);

    // 2. Fetch States/Cities when Country Code changes
    useEffect(() => {
        if (!selectedCountryCode) {
            setStates([]);
            setCities([]);
            setSelectedStateCode("");
            return;
        }

        setIsLoading(true);
        setSelectedStateCode("");
        setStates([]);
        setCities([]);

        // PH Exception: Custom filter, no states needed
        if (selectedCountryCode === 'PH') {
            getCitiesAction(selectedCountryCode).then(res => {
                setCities(res);
                setIsLoading(false);
            });
        } else {
            getStatesAction(selectedCountryCode).then(stateList => {
                if (stateList && stateList.length > 0) {
                    setStates(stateList);
                    setIsLoading(false);
                } else {
                    // No states, fetch cities directly
                    setStates([]);
                    getCitiesAction(selectedCountryCode).then(cityList => {
                        setCities(cityList);
                        setIsLoading(false);
                    });
                }
            });
        }
    }, [selectedCountryCode]);

    // 3. Fetch Cities when State Code changes
    useEffect(() => {
        if (!selectedStateCode) return;

        setIsLoading(true);
        getCitiesAction(selectedCountryCode, selectedStateCode).then(res => {
            setCities(res);
            setIsLoading(false);
        });
    }, [selectedStateCode, selectedCountryCode]);

    // 4. Handle City Selection -> Navigation
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        setSelectedCity(city);
        if (city) {
            router.push(`/stores?city=${encodeURIComponent(city)}`);
        } else {
            router.push(`/stores`);
        }
    };

    return (
        <div className="flex gap-4 max-w-4xl mx-auto flex-col md:flex-row">
            {/* Country Select - Autocomplete */}
            <div className="relative flex-1">
                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                    <PopoverTrigger asChild>
                        <button
                            role="combobox"
                            aria-expanded={openCountry}
                            className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 rounded-full py-3 pl-6 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-lg hover:border-slate-600"
                        >
                            <span className="truncate">
                                {selectedCountryCode
                                    ? countries.find((c) => c.code === selectedCountryCode)?.name
                                    : "Select Country..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-700 bg-slate-950">
                        <Command className="bg-slate-950 text-white">
                            <CommandInput placeholder="Search country..." className="border-slate-800" />
                            <CommandList>
                                <CommandEmpty>No country found.</CommandEmpty>
                                <CommandGroup>
                                    {countries.map((country) => (
                                        <CommandItem
                                            key={country.code}
                                            value={country.name}
                                            onSelect={() => {
                                                setSelectedCountryCode(country.code === selectedCountryCode ? "" : country.code);
                                                setOpenCountry(false);
                                            }}
                                            className="text-slate-300 aria-selected:bg-slate-800 aria-selected:text-white"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedCountryCode === country.code ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {country.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* State Select - Conditional */}
            {states.length > 0 && (
                <div className="relative flex-1 animate-in fade-in slide-in-from-left-4 duration-300">
                    <select
                        value={selectedStateCode}
                        onChange={(e) => setSelectedStateCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-lg appearance-none cursor-pointer"
                    >
                        <option value="">Select Region/State...</option>
                        {states.map(s => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="text-xl">🗺️</span>
                    </div>
                </div>
            )}

            {/* City Select */}
            <div className="relative flex-1">
                <select
                    value={selectedCity}
                    onChange={handleCityChange}
                    disabled={(!selectedCountryCode && !currentCity) || (states.length > 0 && !selectedStateCode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">
                        {states.length > 0 && !selectedStateCode ? "Select State first..." : (currentCity ? currentCity : "Select City...")}
                    </option>
                    {cities.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                </select>
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Button */}
            {(selectedCountryCode || currentCity) && (
                <button
                    onClick={() => {
                        setSelectedCountryCode("");
                        setSelectedStateCode("");
                        setSelectedCity("");
                        router.push("/stores");
                    }}
                    className="px-6 py-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 transition-all font-bold text-sm whitespace-nowrap"
                >
                    Clear Filters
                </button>
            )}
        </div>
    );
}
