"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useUser } from "@stackframe/stack";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, LogOut, Settings, Trophy, CreditCard, Shield, Medal } from "lucide-react";
import Image from "next/image";
import { NotificationCenter } from "@/components/features/notification-center";
import { SupportButton } from "@/components/features/support-button";

export function SiteHeader() {
    const user = useUser();
    const [profile, setProfile] = useState<{ username: string | null, avatar_url: string | null }>({ username: null, avatar_url: null });
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function getProfile() {
            const { data } = await supabase
                .from("profiles")
                .select("username, avatar_url, email")
                .eq("id", user!.id)
                .single();

            if (data) {
                const updates: any = {};
                if (!data.avatar_url && user!.profileImageUrl) updates.avatar_url = user!.profileImageUrl;
                if (!data.email && user!.primaryEmail) updates.email = user!.primaryEmail;

                if (Object.keys(updates).length > 0) {
                    await supabase.from("profiles").update(updates).eq("id", user!.id);
                    setProfile({
                        username: data.username,
                        avatar_url: updates.avatar_url || data.avatar_url
                    });
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

    // Close menu on outside click
    useEffect(() => {
        if (!isMenuOpen) return;
        const closeMenu = () => setIsMenuOpen(false);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [isMenuOpen]);

    const pathname = usePathname();
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/forgot-password";

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 py-2">
            <div className="container flex h-16 items-center justify-between px-2 md:px-6">
                {/* Logo Section - Aligned Left on Mobile */}
                <div className="flex items-center gap-1 md:gap-4">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="relative w-32 md:w-48 h-12 md:h-16">
                            <Image
                                src="/logo.png"
                                alt="BeyBracket"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>
                </div>

                {/* Main Navigation - Desktop */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium absolute left-1/2 -translate-x-1/2">
                    <Link href="/tournaments" className="text-foreground/60 hover:text-foreground transition-colors">
                        Events
                    </Link>
                    <Link href="/stores" className="text-foreground/60 hover:text-foreground transition-colors">
                        Directory
                    </Link>
                    <Link href="/decks" className="text-foreground/60 hover:text-foreground transition-colors">
                        Decks
                    </Link>
                    {user && (
                        <Link href="/create" className="text-foreground/60 hover:text-foreground transition-colors">
                            Host Event
                        </Link>
                    )}
                </nav>

                {/* Mobile Navigation - Always visible on small screens */}
                <nav className="flex md:hidden items-center gap-3 text-xs font-medium">
                    <Link href="/tournaments" className="text-foreground/60 hover:text-foreground transition-colors px-2 py-1">
                        Events
                    </Link>
                    <Link href="/stores" className="text-foreground/60 hover:text-foreground transition-colors px-2 py-1">
                        Directory
                    </Link>
                    <Link href="/decks" className="text-foreground/60 hover:text-foreground transition-colors px-2 py-1">
                        Decks
                    </Link>
                    {user && (
                        <Link href="/create" className="text-foreground/60 hover:text-foreground transition-colors px-2 py-1">
                            Host
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-2 md:gap-4 pr-1 md:pr-2">
                    {/* Support Button (Desktop: Full, Mobile/Tablet/Landscape: Icon) */}
                    <div>
                        <div className="hidden lg:block">
                            <SupportButton variant="full" />
                        </div>
                        <div className="lg:hidden">
                            <SupportButton variant="icon" className="w-8 h-8 border-none bg-transparent hover:bg-slate-800" />
                        </div>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-2 md:gap-4">
                            <NotificationCenter />
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all pointer-events-auto"
                                >
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

                                {/* Dropdown Menu - Click Based Toggle */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 top-full pt-2 w-64 transition-all z-[100]">
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5">
                                            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                                                <p className="font-bold text-white truncate">{profile.username || "User"}</p>
                                                <p className="text-xs text-slate-400 truncate">{user.primaryEmail}</p>
                                            </div>
                                            <div className="p-2">
                                                {user.primaryEmail === 'shearjovan7@gmail.com' && (
                                                    <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors mb-2 border border-red-500/20">
                                                        <Shield className="w-4 h-4" /> Admin Console
                                                    </Link>
                                                )}
                                                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Trophy className="w-4 h-4" /> My Dashboard
                                                </Link>
                                                <Link href="/leaderboard" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Trophy className="w-4 h-4" /> Leaderboards
                                                </Link>
                                                <Link href="/achievements" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Medal className="w-4 h-4" /> Achievements
                                                </Link>
                                                <Link
                                                    href={profile.username ? `/u/${profile.username}` : "/account"}
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <User className="w-4 h-4" /> My Profile
                                                </Link>
                                                <Link
                                                    href="/account"
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" /> Account Settings
                                                </Link>
                                                <Link
                                                    href="/dashboard/billing"
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <CreditCard className="w-4 h-4" /> Billing & Subscription
                                                </Link>
                                                {/* Mobile Only Support Button in Menu - Keeping it for consistency in menu flow as well */}
                                                <div className="md:hidden pt-2 mt-2 border-t border-slate-800">
                                                    <SupportButton variant="mobile" />
                                                </div>
                                            </div>
                                            <div className="p-2 border-t border-slate-800">
                                                <button onClick={() => { user.signOut(); setIsMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors">
                                                    <LogOut className="w-4 h-4" /> Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        !isAuthPage && (
                            <div className="flex items-center gap-4">
                                {/* Duplicate Button Removed Here */}
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
