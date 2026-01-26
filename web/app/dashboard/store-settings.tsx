"use client";

import { useActionState, useState } from "react";
import { updateStoreAction } from "@/app/actions";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { AddressAutocomplete } from "@/components/features/address-autocomplete";

export default function StoreSettings({ store: initialStore }: { store: any }) {
    const [state, action, isPending] = useActionState(updateStoreAction, null);
    const [isOpen, setIsOpen] = useState(false);

    // Store State
    const [store, setStore] = useState<{
        name: string,
        description: string,
        image_url: string | null,
        contact_number: string,
        address: string,
        city: string,
        country: string,
        primary_color?: string,
        secondary_color?: string
    }>({
        name: initialStore?.name || "",
        description: initialStore?.description || "",
        image_url: initialStore?.image_url || null,
        contact_number: initialStore?.contact_number || "",
        address: initialStore?.address || "",
        city: initialStore?.city || "",
        country: initialStore?.country || "",
        primary_color: initialStore?.primary_color || "#22d3ee",
        secondary_color: initialStore?.secondary_color || "#a855f7"
    });

    const isPro = initialStore?.plan === 'pro';

    if (!initialStore) {
        return <div className="p-6 text-red-500">Error: Store data could not be loaded.</div>;
    }

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
                        <input type="hidden" name="city" value={store.city} />
                        <input type="hidden" name="country" value={store.country} />

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

                        <div className="space-y-4">
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
                                <AddressAutocomplete
                                    name="address"
                                    defaultValue={store.address}
                                    placeholder="Search specific store address..."
                                    onAddressSelect={(res) => {
                                        setStore(s => ({
                                            ...s,
                                            address: res.address,
                                            city: res.city,
                                            country: res.country
                                        }));
                                    }}
                                />
                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="bg-secondary/50 px-2 py-0.5 rounded">City: {store.city || "None"}</span>
                                    <span className="bg-secondary/50 px-2 py-0.5 rounded">Country: {store.country || "None"}</span>
                                </div>
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
