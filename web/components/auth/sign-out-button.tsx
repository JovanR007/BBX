"use client";

import { useUser } from "@stackframe/stack";
import { LogOut } from "lucide-react";

export function SignOutButton() {
    const user = useUser();

    if (!user) return null;

    return (
        <button
            onClick={() => user.signOut()}
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-4 py-2 rounded-md transition-colors font-medium text-sm"
        >
            <LogOut className="w-4 h-4" />
            Sign Out
        </button>
    );
}
