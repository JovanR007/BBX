import { Deck } from "@/lib/decks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sword, Shield, Zap, Layers } from "lucide-react";
import Image from "next/image";

interface DeckCardProps {
    deck: Deck;
    className?: string;
    showParts?: boolean;
}

export function DeckCard({ deck, className, showParts = true }: DeckCardProps) {
    return (
        <Card className={`overflow-hidden border-slate-800 bg-slate-950 text-slate-200 ${className}`}>
            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                {deck.image_url ? (
                    <Image
                        src={deck.image_url}
                        alt={deck.name}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                        <Layers className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-xs font-mono uppercase tracking-widest opacity-50">No Squad Photo</span>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                    <h3 className="text-lg font-bold text-white leading-none">{deck.name}</h3>
                    {deck.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{deck.description}</p>}
                </div>
            </div>

            {showParts && (
                <CardContent className="p-4 space-y-3">
                    {deck.deck_beys?.sort((a, b) => a.slot_number - b.slot_number).map((bey) => (
                        <div key={bey.id} className="flex items-center gap-2 p-2 rounded bg-slate-900/50 border border-slate-800/50">
                            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-500 shrink-0">
                                {bey.slot_number}
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-3 gap-1 text-xs">
                                <div className="flex items-center gap-1 truncate" title={bey.blade?.name}>
                                    <Sword className="w-3 h-3 text-cyan-500 shrink-0" />
                                    <span className="truncate">{bey.blade?.name || "-"}</span>
                                </div>
                                <div className="flex items-center gap-1 truncate" title={bey.ratchet?.name}>
                                    <Shield className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span className="truncate">{bey.ratchet?.name || "-"}</span>
                                </div>
                                <div className="flex items-center gap-1 truncate" title={bey.bit?.name}>
                                    <Zap className="w-3 h-3 text-yellow-500 shrink-0" />
                                    <span className="truncate">{bey.bit?.name || "-"}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!deck.deck_beys || deck.deck_beys.length === 0) && (
                        <div className="text-center text-xs text-slate-600 py-2 italic">No parts configured</div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
