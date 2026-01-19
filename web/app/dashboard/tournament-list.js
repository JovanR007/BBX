"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, Users } from "lucide-react";

export default function TournamentList({ tournaments }) {
    const [filter, setFilter] = useState("active"); // "active" or "past"

    const filteredTournaments = tournaments.filter((t) => {
        if (filter === "active") {
            return t.status !== "completed";
        } else {
            return t.status === "completed";
        }
    });

    return (
        <div>
            <div className="flex space-x-4 mb-6 border-b pb-1">
                <button
                    onClick={() => setFilter("active")}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${filter === "active"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Active Tournaments
                </button>
                <button
                    onClick={() => setFilter("past")}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${filter === "past"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Past Tournaments
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.length === 0 ? (
                    <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
                        <p className="text-muted-foreground">No {filter} tournaments found.</p>
                    </div>
                ) : (
                    filteredTournaments.map((t) => (
                        <Link
                            key={t.id}
                            href={`/t/${t.id}`}
                            className="group block bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                    <span
                                        className={`text-xs font-bold px-2 py-1 rounded-full ${{
                                            registration: "bg-green-500/10 text-green-500",
                                            started: "bg-blue-500/10 text-blue-500",
                                            completed: "bg-muted text-muted-foreground",
                                        }[t.status] || "bg-muted"
                                            }`}
                                    >
                                        {t.status === "registration" ? "REGISTRATION OPEN" : t.status.toUpperCase().replace("_", " ")}
                                    </span>
                                </div>

                                <h3 className="font-bold text-lg mb-2 truncate">{t.name}</h3>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        {new Date(t.created_at).toLocaleDateString()}
                                    </div>
                                    {/* Assuming we might have cuts or other info */}
                                    {t.top_cut_type && (
                                        <div className="flex items-center">
                                            <Users className="h-4 w-4 mr-2" />
                                            Top {t.top_cut_type} Cut
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
