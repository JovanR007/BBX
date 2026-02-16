"use client";

import { Sword } from "lucide-react";

interface PlayerJoinProps {
    tournamentId: string;
    isRegistered?: boolean;
}

export function PlayerJoin({ tournamentId, isRegistered }: PlayerJoinProps) {
    if (isRegistered) {
        return (
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 text-center">
                <p className="text-green-400 font-bold flex items-center justify-center gap-2">
                    <Sword className="w-4 h-4" /> You are registered!
                </p>
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 font-medium">
                Registration is managed by the Tournament Organizer.
                <br />
                Please ask an admin to add you or send an invite.
            </p>
        </div>
    );
}
