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

    // 2. Sync state when Prop OR Countries change
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
                        // Optional: clear cities or keep them empty until state selected
                        setCities([]);
                    } else {
                        // No states
                        const cityList = await getCitiesAction(countryParams.code);
                        setCities(cityList);
                    }
                }
            }
        }
        syncData();
    }, [initialStore.country, countries]);

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

    const [store, setStore] = useState<{ name: string, description: string, image_url: string | null, contact_number: string, address: string }>({
        name: initialStore?.name || "",
        description: initialStore?.description || "",
        image_url: initialStore?.image_url || null,
        contact_number: initialStore?.contact_number || "",
        address: initialStore?.address || ""
    });

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
