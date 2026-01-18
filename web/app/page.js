"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Trophy, Plus, ArrowRight, Loader2 } from "lucide-react";

export default function LandingPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setTournaments(data);
      setLoading(false);
    }
    fetchTournaments();
  }, []);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-8 text-center mb-16">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            BBX Tournament Platform
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground text-xl">
            The community standard for Beyblade X tournaments.
            <br />
            Find a local tournament or host your own in seconds.
          </p>
        </div>

        <Link
          href="/create"
          className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" /> Host a Tournament
        </Link>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
        ) : (
          <>
            <Section
              title="Active Tournaments"
              tournaments={tournaments.filter(t => t.status !== 'completed')}
              emptyMsg="No active tournaments."
            />

            {tournaments.some(t => t.status === 'completed') && (
              <Section
                title="Past Tournaments"
                tournaments={tournaments.filter(t => t.status === 'completed')}
                isPast
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, tournaments, emptyMsg, isPast }) {
  if (tournaments.length === 0 && !emptyMsg) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">{tournaments.length} found</span>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
          {emptyMsg}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            let statusLabel = "Registration Open";
            let statusColor = "text-green-400 bg-green-500/10 border-green-500/20";

            if (t.status === 'started') {
              statusLabel = "In Progress";
              statusColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
            } else if (t.status === 'completed') {
              statusLabel = "Completed";
              statusColor = "text-muted-foreground bg-secondary border-border";
            }

            return (
              <Link key={t.id} href={`/t/${t.id}`} className={cn("group relative rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden", isPast && "opacity-75 hover:opacity-100")}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2 rounded-lg transition-colors", t.status === 'completed' ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-400")}>
                      <Trophy className="w-6 h-6" />
                    </div>
                    <span className={cn("text-[10px] uppercase font-bold border px-2 py-1 rounded-full", statusColor)}>
                      {statusLabel}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{t.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>Top {t.cut_size} Cut</span>
                  </div>
                </div>
                {!isPast && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { cn } from "@/lib/utils";
