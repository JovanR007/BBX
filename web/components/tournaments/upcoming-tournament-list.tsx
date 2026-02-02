
"use client";

import Link from "next/link";
import { Users, ChevronRight, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpcomingTournamentListProps {
    tournaments: any[];
}

export function UpcomingTournamentList({ tournaments }: UpcomingTournamentListProps) {
    if (tournaments.length === 0) {
        return (
            <div className="text-center py-24 border rounded-3xl border-dashed border-slate-900 bg-slate-950/50 backdrop-blur-sm">
                <p className="text-muted-foreground font-medium text-lg">No upcoming tournaments found.</p>
                <Link href="/create" className="text-cyan-400 font-bold mt-4 inline-block hover:underline">
                    Host Your Own Event &rarr;
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {/* Header Row (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/50 mb-2">
                <div className="col-span-2">Date</div>
                <div className="col-span-6">Event</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-1 text-right">Status</div>
            </div>

            {tournaments.map((t) => {
                const date = new Date(t.start_time);
                const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = date.getDate();
                const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                return (
                    <Link
                        key={t.id}
                        href={`/t/${t.slug || t.id}`}
                        className="group relative grid md:grid-cols-12 gap-4 items-center p-4 rounded-xl border border-transparent hover:bg-slate-900 hover:border-slate-800 transition-all duration-200"
                    >
                        {/* Mobile: Top Row Info */}
                        <div className="md:hidden flex items-center justify-between col-span-12 mb-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span>{month} {day} • {time}</span>
                        </div>

                        {/* Col 1: Date Badge (Desktop) */}
                        <div className="hidden md:flex col-span-2 items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-slate-700 group-hover:bg-slate-800 transition-colors">
                                <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-0.5">{month}</span>
                                <span className="text-lg font-black text-white leading-none">{day}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{time}</span>
                        </div>

                        {/* Col 2: Event Name & Host */}
                        <div className="col-span-12 md:col-span-6">
                            <h3 className="text-base md:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                                {t.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-slate-500 truncate">
                                    Hosted by <span className="text-slate-400 font-bold">{t.stores?.name || t.organizer?.display_name || "Community"}</span>
                                </span>
                                {!t.is_ranked && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 rounded">
                                        CASUAL
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Col 3: Location */}
                        <div className="col-span-12 md:col-span-3 flex items-center gap-2 text-sm text-slate-400">
                            <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                            <span className="truncate">{t.location || (t.stores?.city ? t.stores.city : "Online")}</span>
                        </div>

                        {/* Col 4: Status (Player Count + Arrow) */}
                        <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-3 text-sm">
                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-300 transition-colors">
                                <Users className="w-4 h-4" />
                                <span className="font-bold">{t.participants_count || 0}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
