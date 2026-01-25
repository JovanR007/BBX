"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { StoreCard } from "@/components/features/store-card";
import { Loader2 } from "lucide-react";
import { useUser } from "@stackframe/stack";
import { cn } from "@/lib/utils";
import { Store } from "@/types";

export default function LandingPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useUser();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Featured Stores (Only Pro Plan) - Premium Exclusivity
      const { data } = await supabase
        .from("stores")
        .select("id, created_at, owner_id, name, slug, image_url, address, contact_number, city, country, primary_color, secondary_color, plan")
        .eq("plan", "pro")
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

      <div className="container mx-auto px-4 py-8 md:py-16 relative flex-1">

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
            {user ? (
              <Link
                href="/dashboard"
                className="relative inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-cyan-500/25 border border-slate-800 hover:border-cyan-500/50 group"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 group-hover:opacity-40 blur transition-opacity" />
                <span className="relative">
                  {isOwner ? "Manage Tournaments" : "My Blader Profile"}
                </span>
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="relative inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-cyan-500/25 border border-slate-800 hover:border-cyan-500/50 group"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 group-hover:opacity-40 blur transition-opacity" />
                <span className="relative">
                  Get Started
                </span>
              </Link>
            )}

            <Link
              href="/stores"
              className="relative inline-flex items-center justify-center rounded-full bg-slate-950/50 backdrop-blur-sm px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 border border-slate-800 hover:bg-slate-800"
            >
              Find Local Shops
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">Featured Hobby Stores</h2>
            <span className="text-sm text-neutral-500">{stores.length} found</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-muted-foreground">
              No stores authorized yet.
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
