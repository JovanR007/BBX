"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Store, MapPin, Phone, Loader2, ArrowRight, Trophy, Users } from "lucide-react";
import { UserButton, useUser } from "@stackframe/stack";
import { cn } from "@/lib/utils";
import LiveMatchTicker from "@/app/components/live-match-ticker";

export default function LandingPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUser();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Stores
      const { data } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setStores(data);
      setLoading(false);

      // 2. Check Ownership (if user exists)
      if (user) {
        const { data: myStore } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (myStore) setIsOwner(true);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <LiveMatchTicker />

      <div className="container mx-auto px-4 py-8 md:py-16 relative flex-1">
        <div className="absolute top-4 right-4">
          <UserButton />
        </div>

        <div className="flex flex-col items-center justify-center space-y-8 text-center mb-12 md:mb-16 pt-12 relative z-10">

          {/* Glow Effect behind Title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="space-y-6 relative">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
              BEYBRACKET
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-400 text-xl md:text-2xl font-light">
              Unleash the Spin. <span className="text-cyan-400 font-semibold">Connect</span>, <span className="text-purple-400 font-semibold">Compete</span>, and <span className="text-blue-400 font-semibold">Conquer</span>.
            </p>
          </div>

          <div className="flex gap-4">
            {user && (
              <Link
                href="/dashboard"
                className="relative inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-cyan-500/25 border border-slate-800 hover:border-cyan-500/50 group"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 group-hover:opacity-40 blur transition-opacity" />
                <span className="relative">
                  {isOwner ? "Manage Tournaments" : "My Blader Profile"}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Featured Hobby Stores</h2>
            <span className="text-sm text-muted-foreground">{stores.length} found</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              No stores authorized yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreCard({ store }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/s/${store.slug}`}
      className="group block bg-card border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
    >
      <div className="relative h-48 bg-muted">
        {store.image_url && !imgError ? (
          <img
            src={store.image_url}
            alt={store.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <Store className="w-16 h-16" />
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{store.name}</h3>

        <div className="space-y-2 text-sm text-muted-foreground">
          {store.address && (
            <div className="flex items-start">
              <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{store.address}</span>
            </div>
          )}
          {store.contact_number && (
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 shrink-0" />
              <span>{store.contact_number}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
          View Tournaments <ArrowRight className="ml-2 w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
