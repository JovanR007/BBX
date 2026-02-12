"use client";

import { useState, useEffect } from "react";
import { BeyPart, createDeck, updateDeck, deleteDeck, Deck, getAllParts } from "@/lib/decks";
import { uploadDeckImageAction } from "@/app/actions/upload";
import { PartSelect } from "./part-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface DeckBuilderProps {
    userId: string;
    existingDeck?: Deck | null;
    onDeckCreated?: () => void;
    onDeckUpdated?: () => void;
    onDeckDeleted?: () => void;
    onCancel?: () => void;
}

export function DeckBuilder({ userId, existingDeck, onDeckCreated, onDeckUpdated, onDeckDeleted, onCancel }: DeckBuilderProps) {
    const { toast } = useToast();
    const [parts, setParts] = useState<BeyPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Deck State
    const [deckName, setDeckName] = useState(existingDeck?.name || "");
    const [description, setDescription] = useState(existingDeck?.description || "");
    const [imageUrl, setImageUrl] = useState(existingDeck?.image_url || "");

    // Bey States (Array of 3 objects)
    const [beys, setBeys] = useState<any[]>([
        { slot: 1 }, { slot: 2 }, { slot: 3 }
    ]);

    useEffect(() => {
        if (existingDeck && existingDeck.deck_beys) {
            // Map existing beys to state format
            const mappedBeys = [0, 1, 2].map(idx => {
                const existingBey = existingDeck.deck_beys.find(b => b.slot_number === idx + 1);
                return existingBey ? {
                    slot: idx + 1,
                    blade_id: existingBey.blade?.id || existingBey.blade_id, // Handle joined vs raw
                    ratchet_id: existingBey.ratchet?.id || existingBey.ratchet_id,
                    bit_id: existingBey.bit?.id || existingBey.bit_id,
                    lock_chip_id: existingBey.lock_chip?.id || existingBey.lock_chip_id,
                    assist_blade_id: existingBey.assist_blade?.id || existingBey.assist_blade_id,
                    // Derive series for CX logic
                    blade_series: existingBey.blade?.series || (parts.find(p => p.id === existingBey.blade_id)?.series)
                } : { slot: idx + 1 };
            });
            setBeys(mappedBeys);
        }
    }, [existingDeck, parts]); // Re-run when parts load to ensure series lookup works

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
            const deckData = {
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
            };

            if (existingDeck) {
                await updateDeck(userId, existingDeck.id, deckData);
                toast({ title: "Deck updated successfully!" });
                if (onDeckUpdated) onDeckUpdated();
            } else {
                await createDeck(userId, deckData);
                toast({ title: "Deck created successfully!" });
                if (onDeckCreated) onDeckCreated();
            }

            // Cleanup provided by parent (switching views)
        } catch (e) {
            console.error(e);
            toast({ title: `Failed to ${existingDeck ? 'update' : 'create'} deck`, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!existingDeck) return;

        if (!window.confirm("Are you sure you want to delete this deck? This cannot be undone.")) {
            return;
        }

        setDeleting(true);
        try {
            await deleteDeck(userId, existingDeck.id);
            toast({ title: "Deck deleted" });
            if (onDeckDeleted) onDeckDeleted();
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to delete deck", variant: "destructive" });
            setDeleting(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Loading parts...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {existingDeck ? <Save className="w-5 h-5 text-cyan-400" /> : <Plus className="w-5 h-5 text-cyan-400" />}
                    {existingDeck ? "Edit Deck" : "Create New Deck"}
                </h2>
                <div className="flex gap-2">
                    {existingDeck && (
                        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting || submitting}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
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
                    {/* ... (Photo upload section remains same but context is simplified) ... */}
                    <div className="space-y-2">
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
                            <div className="mt-2 relative w-full h-64 rounded-lg overflow-hidden border border-slate-800 group">
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

            <div className="flex justify-end pt-4 gap-2">
                {onCancel && (
                    <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                )}
                <Button onClick={handleSubmit} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[150px]">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {existingDeck ? "Update Deck" : "Create Deck"}
                </Button>
            </div>
        </div>
    );
}
