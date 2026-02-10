"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import LiveMatchTicker from "@/components/features/live-match-ticker";
import { Suspense } from "react";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isProjectorMode = pathname?.includes("/projector");

    return (
        <div className="relative flex min-h-screen flex-col">
            {!isProjectorMode && <LiveMatchTicker />}
            {!isProjectorMode && (
                <Suspense fallback={<div className="h-14 border-b bg-background/95" />}>
                    <SiteHeader />
                </Suspense>
            )}
            <main className="flex-1">{children}</main>
            {!isProjectorMode && <SiteFooter />}
        </div>
    );
}
