"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { BeyPart } from "@/lib/decks";

interface PartSelectProps {
    label: string;
    parts: BeyPart[];
    selectedPartId?: string;
    onSelect: (partId: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function PartSelect({ label, parts, selectedPartId, onSelect, disabled, placeholder }: PartSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedPart = parts.find(p => p.id === selectedPartId);

    return (
        <div className="space-y-1.5">
            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider ml-1">
                {label}
            </label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between bg-slate-900 border-slate-800 hover:bg-slate-800 text-left font-normal",
                            !selectedPart && "text-slate-500",
                            selectedPart && "text-white font-medium"
                        )}
                    >
                        {selectedPart ? selectedPart.name : (placeholder || "Select part...")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-slate-900 border-slate-800 z-[200]">
                    <Command className="bg-slate-900">
                        <CommandInput placeholder={`Search ${label}...`} className="text-white" />
                        <CommandList>
                            <CommandEmpty className="py-4 text-center text-xs text-slate-500">
                                No parts found.
                            </CommandEmpty>
                            <CommandGroup>
                                {parts.map((part) => (
                                    <CommandItem
                                        key={part.id}
                                        value={part.name}
                                        onSelect={() => {
                                            onSelect(part.id);
                                            setOpen(false);
                                        }}
                                        className="aria-selected:bg-slate-800 cursor-pointer pointer-events-auto"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedPartId === part.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white">{part.name}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{part.series}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
