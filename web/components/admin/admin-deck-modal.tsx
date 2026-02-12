"use client";

import { useState } from "react";
import { X, Layers } from "lucide-react";
import { DeckBuilder } from "@/components/decks/deck-builder";
import { updateParticipantDeckAction } from "@/app/actions/participant";
import { useToast } from "@/components/ui/toaster";

interface AdminDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    participantId: string;
    userId: string | null;
    playerName: string;
    onDeckCreated: () => void;
}

export function AdminDeckModal({ isOpen, onClose, participantId, userId, playerName, onDeckCreated }: AdminDeckModalProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleDeckCreated = async (deckId: string) => {
        setIsSaving(true);
        try {
            const res = await updateParticipantDeckAction(participantId, deckId);
            if (res.success) {
                toast({ title: "Deck Assigned", description: "The deck has been linked to this participant.", variant: "success" });
                onDeckCreated();
                onClose();
            } else {
                toast({ title: "Failed to Link Deck", description: res.error, variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950 z-10">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                            <Layers className="w-4 h-4 text-cyan-500" />
                            Create Deck for {playerName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {userId ? "Registered User" : "Unregistered Player"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <DeckBuilder
                        userId={userId}
                        onCancel={onClose}
                        onDeckCreated={handleDeckCreated}
                    />
                </div>
            </div>
        </div>
    );
}
