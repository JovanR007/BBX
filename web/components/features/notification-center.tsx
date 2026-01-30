"use client";

import { useEffect, useState } from "react";
import { Bell, Trophy, Check, X, Loader2, Store, ArrowRight } from "lucide-react";
import { getNotificationsAction, acceptInviteAction, deleteInviteAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export function NotificationCenter() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    async function fetchNotifications() {
        const res = await getNotificationsAction();
        if (res.success && res.items) {
            setItems(res.items);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function handleAcceptInvite(token: string, inviteId: string) {
        setProcessingId(inviteId);
        const res = await acceptInviteAction(token);
        if (res.success) {
            toast({ title: "Joined!", description: "You have joined the tournament.", variant: "success" });
            setItems(items.filter(i => i.id !== inviteId));
            if (res.tournamentId) {
                router.push(`/t/${res.tournamentId}`);
            }
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setProcessingId(null);
    }

    async function handleDeclineInvite(inviteId: string) {
        setProcessingId(inviteId);
        toast({ title: "Coming soon", description: "Decline feature is being updated." });
        setProcessingId(null);
    }

    const pendingCount = items.length;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {pendingCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {pendingCount > 0 && <span className="text-xs text-muted-foreground">{pendingCount} New</span>}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No new notifications
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {items.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                                    {/* --- TOURNAMENT INVITE --- */}
                                    {item.type === 'invite' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit">
                                                    <Trophy className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm font-medium leading-none">Tournament Invite</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Invited to <span className="text-white font-semibold">{item.data.tournaments?.name}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleDeclineInvite(item.id)}>Decline</Button>
                                                <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleAcceptInvite(item.data.token, item.id)}>Accept</Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- STORE APPLICATION (ADMIN) --- */}
                                    {item.type === 'store_application' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <div className="mt-1 bg-purple-500/10 p-2 rounded-full h-fit">
                                                    <Store className="w-4 h-4 text-purple-400" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm font-medium leading-none">New Store Application</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        <span className="text-white font-semibold">{item.data.store_name}</span> by {item.data.profiles?.username}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <Link href="/admin" className="w-full">
                                                    <Button size="sm" variant="secondary" className="w-full h-7 text-xs">
                                                        Review Application <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
