"use client";

import { useUser } from "@stackframe/stack";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard() {
    const user = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Don't check on onboarding page
        if (pathname === "/onboarding") return;

        async function checkProfile() {
            setChecking(true);
            const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user!.id)
                .maybeSingle(); // Use maybeSingle to assume null if not found

            if (!data) {
                // User logged in but no profile -> Onboarding
                console.log("No profile found, redirecting to onboarding");
                router.push("/onboarding");
            }
            setChecking(false);
        }

        checkProfile();
    }, [user, pathname, router]);

    return null; // This component renders nothing
}
