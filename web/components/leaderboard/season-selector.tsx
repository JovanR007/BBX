"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface Season {
    id: string;
    name: string;
    is_active: boolean;
}

export function SeasonSelector({ seasons }: { seasons: Season[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = React.useState(false);
    const currentSeasonId = searchParams.get("season") || "current";

    // Find label
    const activeSeason = seasons.find(s => s.is_active);
    const selectedSeason = seasons.find(s => s.id === currentSeasonId) || (currentSeasonId === 'current' ? activeSeason : null);

    const handleSelect = (seasonId: string) => {
        const params = new URLSearchParams(searchParams);
        if (seasonId === 'current' || (activeSeason && seasonId === activeSeason.id)) {
            params.delete("season");
        } else {
            params.set("season", seasonId);
        }
        router.push(`/leaderboard?${params.toString()}`);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[250px] justify-between border-white/10 bg-slate-900/50 text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span className="truncate">
                            {selectedSeason ? selectedSeason.name : (currentSeasonId === 'current' ? "Active Season" : "Unknown Season")}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-1 bg-slate-950 border-white/10 text-white z-[9999]">
                <div className="flex flex-col gap-1">
                    {/* Header / Search Placeholder if needed, simplified for now */}

                    {/* Option for Active Season */}
                    {activeSeason && (
                        <div
                            key="current"
                            onClick={() => handleSelect('current')}
                            className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                                (currentSeasonId === "current" || currentSeasonId === activeSeason.id) ? "bg-cyan-950/30 text-cyan-400" : "text-white hover:bg-slate-800"
                            )}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    currentSeasonId === "current" || currentSeasonId === activeSeason.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {activeSeason.name} (Active)
                        </div>
                    )}

                    {seasons.filter(s => !s.is_active).map((season) => (
                        <div
                            key={season.id}
                            onClick={() => handleSelect(season.id)}
                            className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                                currentSeasonId === season.id ? "bg-cyan-950/30 text-cyan-400" : "text-white hover:bg-slate-800"
                            )}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    currentSeasonId === season.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {season.name}
                        </div>
                    ))}

                    {seasons.length === 0 && (
                        <div className="py-6 text-center text-sm text-slate-500">No seasons found.</div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
