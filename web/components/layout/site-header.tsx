"use client";

import Link from "next/link";
import { UserButton, useUser } from "@stackframe/stack";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "lucide-react";
import Image from "next/image";

export function SiteHeader() {
    const user = useUser();
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        async function getUsername() {
            const { data } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", user!.id)
                .single();

            if (data?.username) {
                setUsername(data.username);
            }
        }
        getUsername();
    }, [user]);

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-14 items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="font-bold text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        BEYBRACKET
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            {/* Profile Link (Avatar) */}
                            <Link
                                href={username ? `/u/${username}` : "/account"}
                                className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                                title="My Profile"
                            >
                                {user.profileImageUrl ? (
                                    <Image
                                        src={user.profileImageUrl}
                                        alt={user.displayName || "Profile"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                            </Link>

                            {/* Stack Menu (Settings/Logout) - Hiding the default avatar to avoid double avatar */}
                            <div className="relative">
                                <UserButton />
                            </div>
                        </>
                    ) : (
                        <Link href="/handler/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
