"use client";

import dynamic from "next/dynamic";
import { Store } from "@/types";

const StoresMapClient = dynamic(
    () => import("@/components/features/stores-map").then((mod) => mod.StoresMap),
    {
        ssr: false,
        loading: () => (
            <div className="h-[80vh] w-full bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500">
                Loading Map...
            </div>
        ),
    }
);

export function StoresMapLoader({ stores }: { stores: Store[] }) {
    return <StoresMapClient stores={stores} />;
}
