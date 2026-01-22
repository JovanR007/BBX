"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, LogOut, Settings } from "lucide-react";
import Image from "next/image";

export function SiteHeader() {
    const user = useUser();
    const [profile, setProfile] = useState<{ username: string | null, avatar_url: string | null }>({ username: null, avatar_url: null });

    useEffect(() => {
        if (!user) return;

        async function getProfile() {
            const { data } = await supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", user!.id)
                .single();

            if (data) {
                if (!data.avatar_url && user!.profileImageUrl) {
                    await supabase.from("profiles").update({ avatar_url: user!.profileImageUrl }).eq("id", user!.id);
                    setProfile({ username: data.username, avatar_url: user!.profileImageUrl });
                } else {
                    setProfile({ username: data.username, avatar_url: data.avatar_url });
                }
            }
        }
        getProfile();

        // Realtime Subscription
        const channel = supabase
            .channel('header-profile-sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    const newData = payload.new as { username: string, avatar_url: string | null };
                    setProfile({ username: newData.username, avatar_url: newData.avatar_url });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const pathname = usePathname();
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/forgot-password";

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 py-2">
            <div className="container flex h-16 items-center justify-between px-6">
                {/* Logo Section - Bigger and Better */}
                <div className="flex items-center gap-4 pl-2">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="relative w-48 h-16">
                            <Image
                                src="/logo.png"
                                alt="BeyBracket"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </Link>
                </div>

                {/* Main Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium absolute left-1/2 -translate-x-1/2">
                    <Link href="/stores" className="text-foreground/60 hover:text-foreground transition-colors">
                        Directory
                    </Link>
                    <Link href="/dashboard" className="text-foreground/60 hover:text-foreground transition-colors">
                        Dashboard
                    </Link>
                </nav>

                <div className="flex items-center gap-6 pr-2">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <button className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all">
                                    {profile.avatar_url ? (
                                        <Image
                                            src={profile.avatar_url}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : user.profileImageUrl ? (
                                        <Image
                                            src={user.profileImageUrl}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#1f2937] flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-400" />
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full pt-2 w-64 hidden group-hover:block transition-all z-50">
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
                                        <div className="p-4 border-b border-slate-800">
                                            <p className="font-bold text-white truncate">{profile.username || "User"}</p>
                                            <p className="text-xs text-slate-400 truncate">{user.primaryEmail}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link href={profile.username ? `/u/${profile.username}` : "/account"} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                <User className="w-4 h-4" /> My Profile
                                            </Link>
                                            <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                <Settings className="w-4 h-4" /> Account Settings
                                            </Link>
                                        </div>
                                        <div className="p-2 border-t border-slate-800">
                                            <button onClick={() => user.signOut()} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors">
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        !isAuthPage && (
                            <div className="flex gap-4">
                                <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
                                    Sign In
                                </Link>
                            </div>
                        )
                    )}
                </div>
            </div>
        </header>
    );
}
