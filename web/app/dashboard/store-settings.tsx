"use client";

import { useActionState, useState } from "react";
import { updateStoreAction } from "@/app/actions"; // Ensure this matches export location
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function StoreSettings({ store }: { store: any }) {
    const [state, action, isPending] = useActionState(updateStoreAction, null);
    const [isOpen, setIsOpen] = useState(false);

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
                        <input type="hidden" name="store_id" value={store.id} />

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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Image URL</label>
                            <input
                                name="image_url"
                                defaultValue={store.image_url || ""}
                                placeholder="https://example.com/logo.png"
                                className="w-full bg-background border px-3 py-2 rounded-md"
                            />
                            <p className="text-xs text-muted-foreground">
                                Provide a direct link to your store logo or banner.
                            </p>
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
