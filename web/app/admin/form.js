"use client";

import { useActionState } from "react";
import { createStoreAction } from "./actions";
import { Loader2 } from "lucide-react";

const initialState = {
    success: false,
    error: null,
};

export default function AdminForm() {
    const [state, action, isPending] = useActionState(createStoreAction, initialState);

    return (
        <form action={action} className="space-y-4">
            {state.success && (
                <div className="bg-green-500/10 text-green-500 border border-green-500/20 p-3 rounded-md text-sm">
                    Store created successfully! The owner can now log in.
                </div>
            )}

            {state.error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">Stack User ID (Owner)</label>
                <input
                    name="owner_id"
                    placeholder="e.g. user_..."
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Copy the User ID from the Stack Auth Dashboard.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Store Name</label>
                <input
                    name="name"
                    placeholder="My Awesome Hobby Shop"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Store Slug (URL)</label>
                <input
                    name="slug"
                    placeholder="my-awesome-shop"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Contact Number</label>
                    <input
                        name="contact"
                        placeholder="+1 234..."
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                        name="address"
                        placeholder="123 Main St..."
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center disabled:opacity-50"
            >
                {isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                {isPending ? "Creating..." : "Create Store"}
            </button>
        </form>
    );
}
