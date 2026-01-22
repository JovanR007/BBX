"use client";

import { useActionState, useState, useEffect } from "react";
import { updateStoreAction } from "@/app/actions";
import { getCountriesAction, getStatesAction, getCitiesAction } from "@/app/location-actions";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

export default function StoreSettings({ store: initialStore }: { store: any }) {
    const [state, action, isPending] = useActionState(updateStoreAction, null);
    const [isOpen, setIsOpen] = useState(false);

    // Global Data State
    const [countries, setCountries] = useState<{ name: string, code: string }[]>([]);
    const [states, setStates] = useState<{ name: string, code: string }[]>([]);
    const [cities, setCities] = useState<{ name: string }[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);

    // Selection State
    const [selectedCountryName, setSelectedCountryName] = useState<string>(initialStore.country || "Philippines");
    const [selectedStateCode, setSelectedStateCode] = useState<string>("");

    // 1. Fetch Countries on Mount
    useEffect(() => {
        getCountriesAction().then(setCountries);
    }, []);

    // 2. Sync state when Prop OR Countries change - RESTORE saved state/city
    useEffect(() => {
        if (countries.length === 0) return;

        async function syncData() {
            const currentName = initialStore.country || "Philippines";
            setSelectedCountryName(currentName);

            const countryParams = countries.find(c => c.name === currentName);
            if (countryParams) {
                // Determine if we need states
                if (countryParams.code === 'PH') {
                    // PH: Direct Cities
                    const cityList = await getCitiesAction(countryParams.code);
                    setCities(cityList);
                } else {
                    // Others: Check States
                    const stateList = await getStatesAction(countryParams.code);
                    if (stateList && stateList.length > 0) {
                        setStates(stateList);

                        // RESTORE: If we have a saved city, find its state and load cities
                        if (initialStore.city) {
                            // Try to find which state contains this city
                            let foundStateCode = "";
                            for (const state of stateList) {
                                const citiesInState = await getCitiesAction(countryParams.code, state.code);
                                if (citiesInState.some(c => c.name === initialStore.city)) {
                                    foundStateCode = state.code;
                                    setCities(citiesInState);
                                    break;
                                }
                            }
                            if (foundStateCode) {
                                setSelectedStateCode(foundStateCode);
                            }
                        } else {
                            // Optional: clear cities or keep them empty until state selected
                            setCities([]);
                        }
                    } else {
                        // No states
                        const cityList = await getCitiesAction(countryParams.code);
                        setCities(cityList);
                    }
                }
            }
        }
        syncData();
    }, [initialStore.country, initialStore.city, countries]);

    // Handle Country Change
    const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCountryName = e.target.value;
        setSelectedCountryName(newCountryName);

        // Reset downstream
        setStates([]);
        setCities([]);
        setSelectedStateCode("");

        const countryData = countries.find(c => c.name === newCountryName);
        if (countryData) {
            setIsLoadingLocations(true);

            if (countryData.code === 'PH') {
                const cityList = await getCitiesAction(countryData.code);
                setCities(cityList);
                setIsLoadingLocations(false);
            } else {
                const stateList = await getStatesAction(countryData.code);
                if (stateList && stateList.length > 0) {
                    setStates(stateList);
                    setIsLoadingLocations(false);
                } else {
                    const cityList = await getCitiesAction(countryData.code);
                    setCities(cityList);
                    setIsLoadingLocations(false);
                }
            }
        }
    };

    // Handle State Change
    const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStateCode = e.target.value;
        setSelectedStateCode(newStateCode);

        const countryData = countries.find(c => c.name === selectedCountryName);
        if (countryData) {
            setIsLoadingLocations(true);
            const cityList = await getCitiesAction(countryData.code, newStateCode);
            setCities(cityList);
            setIsLoadingLocations(false);
        }
    };

    const [store, setStore] = useState<{ name: string, description: string, image_url: string | null, contact_number: string, address: string, primary_color?: string, secondary_color?: string }>({
        name: initialStore?.name || "",
        description: initialStore?.description || "",
        image_url: initialStore?.image_url || null,
        contact_number: initialStore?.contact_number || "",
        address: initialStore?.address || "",
        primary_color: initialStore?.primary_color || "#22d3ee", // Default cyan
        secondary_color: initialStore?.secondary_color || "#a855f7" // Default purple
    });

    const isPro = initialStore.plan === 'pro';

    return (
        <div className="bg-card border rounded-xl mb-8 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors text-left"
            >
                <div>
                    <h2 className="text-xl font-bold">Store Settings</h2>
                    <p className="text-sm text-muted-foreground">Edit store details and branding.</p>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {isOpen && (
                <div className="px-6 pb-6 border-t pt-6">
                    <form action={action} className="space-y-4 max-w-lg">
                        <input type="hidden" name="store_id" value={initialStore.id} />

                        {state?.error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                                {state.error}
                            </div>
                        )}
                        {state?.success && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm">
                                {state.message}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Store Name</label>
                            <input
                                name="name"
                                defaultValue={store.name}
                                className="w-full bg-background border px-3 py-2 rounded-md"
                                required
                            />
                        </div>

                        <div className="p-4 bg-muted/50 border rounded-lg flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Store Security PIN</label>
                                <div className="text-xl font-mono font-bold text-primary mt-1">{initialStore.pin || "----"}</div>
                                <p className="text-xs text-muted-foreground mt-1">Use this code to authorize sensitive tournament actions.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Store Logo</label>
                            <ImageUpload
                                value={store.image_url}
                                onChange={(url) => setStore(s => ({ ...s, image_url: url }))}
                                bucketName="store-logos"
                                label="Change Store Logo"
                            />
                            {/* Hidden input to submit the URL */}
                            <input type="hidden" name="image_url" value={store.image_url || ''} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                name="description"
                                defaultValue={store.description || ""}
                                className="w-full bg-background border px-3 py-2 rounded-md h-24"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contact Number</label>
                                <input
                                    name="contact"
                                    defaultValue={store.contact_number || ""}
                                    className="w-full bg-background border px-3 py-2 rounded-md"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Address</label>
                                <input
                                    name="address"
                                    defaultValue={store.address || ""}
                                    className="w-full bg-background border px-3 py-2 rounded-md"
                                />
                            </div>

                            {/* Country Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Country</label>
                                <select
                                    name="country"
                                    value={selectedCountryName}
                                    onChange={handleCountryChange}
                                    className="w-full bg-background border px-3 py-2 rounded-md"
                                >
                                    {countries.length === 0 && <option>Loading...</option>}
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* State Select (Conditional) */}
                            {states.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">State/Region</label>
                                    <select
                                        name="state_region" // Not saved to DB yet, just for filtering
                                        value={selectedStateCode}
                                        onChange={handleStateChange}
                                        className="w-full bg-background border px-3 py-2 rounded-md"
                                    >
                                        <option value="">Select State...</option>
                                        {states.map((s) => (
                                            <option key={s.code} value={s.code}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* City Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">City</label>
                                <select
                                    name="city"
                                    defaultValue={initialStore.city || ""}
                                    className="w-full bg-background border px-3 py-2 rounded-md"
                                    disabled={isLoadingLocations || cities.length === 0}
                                >
                                    <option value="" disabled>Select City</option>
                                    {cities.map((city) => (
                                        <option key={city.name} value={city.name}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Custom Branding (Pro Only) */}
                        <div className="border-t pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                    Custom Branding
                                    {!isPro && (
                                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-[10px] text-white rounded font-black">PRO FEATURE</span>
                                    )}
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center">
                                        Primary Color
                                        <div
                                            className="w-4 h-4 rounded-full ml-auto border border-white/10"
                                            style={{ backgroundColor: store.primary_color }}
                                        />
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            name="primary_color"
                                            value={store.primary_color}
                                            onChange={(e) => setStore(s => ({ ...s, primary_color: e.target.value }))}
                                            disabled={!isPro}
                                            className="w-full h-10 rounded-md cursor-pointer border-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {!isPro && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md pointer-events-none">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Locked</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center">
                                        Secondary Color
                                        <div
                                            className="w-4 h-4 rounded-full ml-auto border border-white/10"
                                            style={{ backgroundColor: store.secondary_color }}
                                        />
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            name="secondary_color"
                                            value={store.secondary_color}
                                            onChange={(e) => setStore(s => ({ ...s, secondary_color: e.target.value }))}
                                            disabled={!isPro}
                                            className="w-full h-10 rounded-md cursor-pointer border-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {!isPro && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md pointer-events-none">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Locked</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {!isPro && (
                                <p className="text-xs text-muted-foreground italic">Upgrade to Pro to unlock custom colors for your store and tournament pages.</p>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium inline-flex items-center hover:bg-secondary/90 transition-colors disabled:opacity-50"
                            >
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
