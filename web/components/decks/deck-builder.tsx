"use client";

import { useState, useEffect } from "react";
import { BeyPart, createDeck, getAllParts } from "@/lib/decks";
import { uploadDeckImageAction } from "@/app/actions/upload";
import { PartSelect } from "./part-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface DeckBuilderProps {
    userId: string;
    onDeckCreated?: () => void;
}

export function DeckBuilder({ userId, onDeckCreated }: DeckBuilderProps) {
    const { toast } = useToast();
    const [parts, setParts] = useState<BeyPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Deck State
    const [deckName, setDeckName] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Bey States (Array of 3 objects)
    const [beys, setBeys] = useState<any[]>([
        { slot: 1 }, { slot: 2 }, { slot: 3 }
    ]);

    useEffect(() => {
        loadParts();
    }, []);

    async function loadParts() {
        try {
            const data = await getAllParts();
            setParts(data);
        } catch (e) {
            console.error(e);
            toast({ title: "Error loading parts", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const updateBey = (index: number, field: string, value: string) => {
        const newBeys = [...beys];
        const bey = { ...newBeys[index] };

        // Set the new value
        bey[field] = value;

        // Logic: If Blade is selected, check Series for CX
        if (field === 'blade_id') {
            const blade = parts.find(p => p.id === value);
            bey.blade_series = blade?.series;

            // Reset CX parts if not CX
            if (blade?.series !== 'CX') {
                bey.lock_chip_id = undefined;
                bey.assist_blade_id = undefined;
            }
        }

        // Logic: Handling Integrated Bits
        // If selecting a Ratchet that is actually "integrated", auto-fill Bit (or hide it)
        // Wait, "integrated" parts are type='integrated'. User selects them in... Ratchet or Bit?
        // User said: "counts towards both".
        // Let's allow selecting "Integrated" in the Ratchet slot.
        if (field === 'ratchet_id') {
            const ratchet = parts.find(p => p.id === value);
            if (ratchet?.type === 'integrated') {
                bey.bit_id = value; // Auto-set bit to same ID? Or disable?
                // Actually, we should probably set a flag to disable the Bit dropdown
            } else {
                // If we previously had an integrated part, and now switched to normal ratchet,
                // we might want to clear the bit if it was 'integrated'
                const currentBit = parts.find(p => p.id === bey.bit_id);
                if (currentBit?.type === 'integrated') {
                    bey.bit_id = undefined;
                }
            }
        }

        // If selecting Integrated in Bit slot... usually they are "Ratchet Integrated Bits", implying they replace the ratchet too.
        // So let's handle primarily in Ratchet slot? Or listed in both?
        // Simpler: Show Integrated in Ratchet list. If selected, disable Bit select.

        newBeys[index] = bey;
        setBeys(newBeys);
    };

    const getFilteredParts = (type: string, series?: string) => {
        return parts.filter(p => {
            if (p.type === type) return true;
            // Special case: Ratchet slot includes 'integrated'
            // Cast type to allow comparison if TS complains about overlap
            if (type === 'ratchet' && (p.type as string) === 'integrated') return true;
            return false;
        });
    };



    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            // Dynamic import to avoid server-only module issues in client component if deemed necessary,
            // but standard import should work if 'use server' is correctly set in the action file.
            // Using direct import since we'll import it at top level.

            const res = await uploadDeckImageAction(formData);

            if (res.success && res.message) {
                setImageUrl(res.message);
                toast({ title: "Image uploaded!" });
            } else {
                throw new Error(res.error || "Upload failed");
            }

        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = "";
        }
    }

    async function handleSubmit() {
        if (!deckName) {
            toast({ title: "Deck name is required", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await createDeck(userId, {
                name: deckName,
                description,
                image_url: imageUrl,
                beys: beys.map(b => ({
                    blade_id: b.blade_id,
                    ratchet_id: b.ratchet_id,
                    bit_id: b.bit_id,
                    lock_chip_id: b.lock_chip_id,
                    assist_blade_id: b.assist_blade_id
                }))
            });
            toast({ title: "Deck created successfully!" });
            if (onDeckCreated) onDeckCreated();
            // Reset form?
            setDeckName("");
            setBeys([{ slot: 1 }, { slot: 2 }, { slot: 3 }]);
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to create deck", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Loading parts...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid gap-4 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" /> Create New Deck
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Deck Name</label>
                        <Input
                            placeholder="e.g. My Tournament Crusher"
                            value={deckName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeckName(e.target.value)}
                            className="bg-slate-900 border-slate-800"
                        />
                    </div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Deck Photo</label>
                    <div className="flex gap-2">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="bg-slate-900 border-slate-800 file:text-cyan-400 file:font-bold hover:file:bg-slate-800"
                            disabled={uploading}
                        />
                    </div>
                    {uploading && <p className="text-xs text-cyan-400 animate-pulse mt-1">Uploading image...</p>}
                    {imageUrl && (
                        <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-slate-800 group">
                            <img src={imageUrl} alt="Deck Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setImageUrl("")}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Image"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Description / Strategy</label>
                    <Textarea
                        placeholder="Describe your strategy..."
                        value={description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        className="bg-slate-900 border-slate-800 min-h-[80px]"
                    />
                </div>
            </div>

            <Tabs defaultValue="bey1" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-900">
                    <TabsTrigger value="bey1">Bey 1</TabsTrigger>
                    <TabsTrigger value="bey2">Bey 2</TabsTrigger>
                    <TabsTrigger value="bey3">Bey 3</TabsTrigger>
                </TabsList>

                {[0, 1, 2].map((index) => {
                    const bey = beys[index];
                    const isCX = bey.blade_series === 'CX';

                    // Integrated Logic
                    const selectedRatchet = parts.find(p => p.id === bey.ratchet_id);
                    const isIntegrated = selectedRatchet?.type === 'integrated';

                    return (
                        <TabsContent key={index} value={`bey${index + 1}`} className="space-y-4 pt-4">
                            <Card className="bg-slate-950 border-slate-800">
                                <CardContent className="p-6 grid gap-6 md:grid-cols-3">

                                    {/* BLADE SLOT */}
                                    <div className="space-y-4">
                                        <PartSelect
                                            label="Blade"
                                            parts={getFilteredParts('blade')}
                                            selectedPartId={bey.blade_id}
                                            onSelect={(id) => updateBey(index, 'blade_id', id)}
                                        />

                                        {isCX && (
                                            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest text-center mb-1">CX System Options</div>
                                                <PartSelect
                                                    label="Lock Chip"
                                                    parts={getFilteredParts('lock_chip')}
                                                    selectedPartId={bey.lock_chip_id}
                                                    onSelect={(id) => updateBey(index, 'lock_chip_id', id)}
                                                />
                                                <PartSelect
                                                    label="Assist Blade"
                                                    parts={getFilteredParts('assist_blade')}
                                                    selectedPartId={bey.assist_blade_id}
                                                    onSelect={(id) => updateBey(index, 'assist_blade_id', id)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* RATCHET SLOT */}
                                    <div>
                                        <PartSelect
                                            label="Ratchet"
                                            parts={getFilteredParts('ratchet')}
                                            selectedPartId={bey.ratchet_id}
                                            onSelect={(id) => updateBey(index, 'ratchet_id', id)}
                                        />
                                        {isIntegrated && (
                                            <div className="mt-2 text-xs text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-900/50">
                                                ℹ️ Integrated Part: Counts as both Ratchet & Bit.
                                            </div>
                                        )}
                                    </div>

                                    {/* BIT SLOT */}
                                    <div>
                                        <PartSelect
                                            label="Bit"
                                            parts={getFilteredParts('bit')}
                                            selectedPartId={bey.bit_id}
                                            onSelect={(id) => updateBey(index, 'bit_id', id)}
                                            // Disable if integrated
                                            disabled={isIntegrated}
                                            placeholder={isIntegrated ? "Included in Ratchet" : undefined}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSubmit} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[150px]">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Deck
                </Button>
            </div>
        </div>
    );
}
