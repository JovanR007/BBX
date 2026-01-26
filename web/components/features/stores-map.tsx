"use client";

import { Store } from "@/types";

export function StoresMap({ stores }: { stores: Store[] }) {
    return (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/50 p-8 text-muted-foreground">
            <div className="text-center">
                <p className="mb-2 text-lg font-semibold">Map View</p>
                <p>Google Maps integration coming soon.</p>
                <p className="text-sm opacity-70">
                    Showing {stores.length} store{stores.length !== 1 ? "s" : ""}
                </p>
            </div>
        </div>
    );
}
