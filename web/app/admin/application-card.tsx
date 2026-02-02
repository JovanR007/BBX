"use client";

import { useState } from "react";
import { approveStoreApplicationAction, rejectStoreApplicationAction } from "@/app/actions";
import { Loader2, Check, X, Store, Phone, MapPin, User } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AdminApplicationCard({ application }: { application: any }) {
    const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting'>('idle');
    const [result, setResult] = useState<'approved' | 'rejected' | null>(null);

    async function handleApprove() {
        if (!confirm("Are you sure you want to approve this store?")) return;
        setStatus('approving');
        const res = await approveStoreApplicationAction(application.id);
        if (res.success) {
            setResult('approved');
        } else {
            alert("Error: " + res.error);
            setStatus('idle');
        }
    }

    async function handleReject() {
        if (!confirm("Reject this application?")) return;
        setStatus('rejecting');
        const res = await rejectStoreApplicationAction(application.id);
        if (res.success) {
            setResult('rejected');
        } else {
            alert("Error: " + res.error);
            setStatus('idle');
        }
    }

    if (result === 'approved') {
        return (
            <div className="p-4 border border-green-500/30 bg-green-500/5 rounded-xl flex items-center gap-3 text-green-500">
                <Check className="w-5 h-5" /> Approved {application.store_name}
            </div>
        );
    }

    if (result === 'rejected') {
        return (
            <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-xl flex items-center gap-3 text-red-500">
                <X className="w-5 h-5" /> Rejected {application.store_name}
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-xl p-6 flex flex-col md:flex-row gap-6">
            {/* User Info */}
            <div className="md:w-1/4 space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-800">
                        {application.profiles?.avatar_url ? (
                            <Image
                                src={application.profiles.avatar_url}
                                alt="User"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <User className="w-5 h-5 m-auto text-slate-500" />
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-sm">{application.profiles?.username || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">{application.email}</p>
                    </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    User ID: {application.user_id}
                </div>
                <div className="text-xs text-slate-500">
                    Applied: {new Date(application.created_at).toLocaleDateString()}
                </div>
            </div>

            {/* Application Data */}
            <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            {application.store_name}
                        </h3>
                        {application.slug && (
                            <p className="text-sm font-mono text-cyan-400">
                                @{application.slug}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {application.contact_number}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="truncate" title={application.address}>{application.address}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4">
                <button
                    onClick={handleApprove}
                    disabled={status !== 'idle'}
                    className="flex-1 btn bg-green-500 hover:bg-green-600 text-white border-0"
                >
                    {status === 'approving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                    onClick={handleReject}
                    disabled={status !== 'idle'}
                    className="flex-1 btn bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/50"
                >
                    {status === 'rejecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
