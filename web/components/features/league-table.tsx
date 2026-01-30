"use client";

import { Crown, Medal, Trophy, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaguePlayer {
    userId: string;
    displayName: string;
    champ: number;
    ru: number;
    top4: number;
    top8: number;
    participation: number;
    total: number;
}

export function StoreLeagueTable({ players, year }: { players: LeaguePlayer[], year: number }) {
    return (
        <div className="space-y-8">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        {year} Season Standings
                    </h2>
                    <p className="text-muted-foreground">
                        Total Participants: <span className="text-foreground font-bold">{players.length}</span>
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-muted/30 border rounded-lg p-4 text-sm flex flex-wrap gap-4 md:gap-8 items-center">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Points Legend:</span>
                <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Champ +4</span>
                </div>
                <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Runner-Up +3</span>
                </div>
                <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-amber-700" />
                    <span className="font-medium">Top 4 +2</span>
                </div>
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Top 8 +1</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Participation +1</span>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-bold text-muted-foreground w-16 text-center">#</th>
                                <th className="p-4 font-bold text-muted-foreground">Player</th>
                                <th className="p-4 font-bold text-muted-foreground text-center text-yellow-500">Champ</th>
                                <th className="p-4 font-bold text-muted-foreground text-center text-slate-400">1RU</th>
                                <th className="p-4 font-bold text-muted-foreground text-center text-amber-700">Top 4</th>
                                <th className="p-4 font-bold text-muted-foreground text-center text-blue-400">Top 8</th>
                                <th className="p-4 font-bold text-muted-foreground text-center text-green-500">Particip.</th>
                                <th className="p-4 font-bold text-foreground text-center bg-primary/5 w-24">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {players.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        No data found for this season yet. Host a tournament to see standings!
                                    </td>
                                </tr>
                            ) : (
                                players.map((player, index) => (
                                    <tr key={player.userId} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 text-center font-mono text-muted-foreground">
                                            {index + 1}
                                        </td>
                                        <td className="p-4 font-semibold text-lg">
                                            {player.displayName}
                                        </td>
                                        <td className="p-4 text-center font-mono opacity-80">{player.champ || "-"}</td>
                                        <td className="p-4 text-center font-mono opacity-80">{player.ru || "-"}</td>
                                        <td className="p-4 text-center font-mono opacity-80">{player.top4 || "-"}</td>
                                        <td className="p-4 text-center font-mono opacity-80">{player.top8 || "-"}</td>
                                        <td className="p-4 text-center font-mono font-bold">{player.participation}</td>
                                        <td className="p-4 text-center font-mono font-black text-xl bg-primary/5">
                                            {player.total}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
