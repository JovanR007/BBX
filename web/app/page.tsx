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
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-slate-950">
      {/* Background Glows for Premium Vibe */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="container mx-auto px-4 py-12 md:py-24 relative flex-1">

        <div className="flex flex-col items-center justify-center space-y-10 text-center mb-20 md:mb-32 pt-12 relative z-10">

          <div className="space-y-6 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              The Next Gen Tournament Platform
            </div>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-400 to-cyan-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.3)] leading-none">
              BEYBRACKET
            </h1>
            <p className="mx-auto max-w-[800px] text-slate-400 text-xl md:text-3xl font-light leading-relaxed">
              Unleash the Spin. <span className="text-white font-medium">Connect</span>, <span className="text-blue-400 font-medium italic">Compete</span>, and <span className="text-cyan-400 font-bold">Conquer</span> the ultimate Beyblade X experience.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {user ? (
              <Link
                href="/dashboard"
                className="relative h-14 inline-flex items-center justify-center rounded-2xl bg-white px-10 text-sm font-bold text-slate-950 shadow-2xl transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 group overflow-hidden"
              >
                <span className="relative z-10">
                  {isOwner ? "MANAGE TOURNAMENTS" : "MY BLADER PROFILE"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity" />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="relative h-14 inline-flex items-center justify-center rounded-2xl bg-white px-10 text-sm font-bold text-slate-950 shadow-2xl transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 group overflow-hidden"
              >
                <span className="relative z-10 uppercase tracking-wider">Get Started Now</span>
              </Link>
            )}

            <Link
              href="/stores"
              className="h-14 inline-flex items-center justify-center rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800 px-10 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:border-slate-700 active:scale-95 uppercase tracking-wider"
            >
              Find Local Shops
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                Verified Partners
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase italic">Featured Hobby Stores</h2>
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="text-lg text-white font-bold">{stores.length}</span>
              <span className="text-sm tracking-wide uppercase">Elite Shops Found</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="animate-spin w-10 h-10 text-blue-500/50" /></div>
          ) : stores.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-900 rounded-3xl bg-slate-950/50 backdrop-blur-sm">
              <p className="text-slate-500 text-lg">No premium stores found in this area yet.</p>
              <Link href="/contact" className="text-blue-400 text-sm font-bold mt-4 inline-block hover:underline lowercase tracking-tight">Become a Partner &rarr;</Link>
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
