"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { updateProfileAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileEditor({ user }: { user: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({ username: '', display_name: '', bio: '' });

    // Fetch existing profile on mount
    useEffect(() => {
        async function load() {
            if (!user?.id) return;
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                setProfile({
                    username: data.username || '',
                    display_name: data.display_name || '',
                    bio: data.bio || ''
                });
            }
        }
        load();
    }, [user]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await updateProfileAction(formData);
        setLoading(false);

        if (res.success) {
            toast({ title: "Profile Updated", description: "Your profile has been saved.", variant: "success" });
            router.refresh(); // Refresh to update links if username changed
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    }

    return (
        <div className="bg-card border rounded-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Blader Profile</h2>
                {profile.username && (
                    <Link
                        href={`/u/${profile.username}`}
                        className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                        target="_blank"
                    >
                        View Public Profile <ExternalLink className="w-3 h-3" />
                    </Link>
                )}
            </div>
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Username (Unique)</label>
                    <input
                        name="username"
                        defaultValue={profile.username}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        placeholder="e.g. BladeStorm99"
                        required
                        pattern="[a-zA-Z0-9_]{3,20}"
                        data-lpignore="true"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Public URL: /u/{profile.username || 'username'}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                        name="display_name"
                        defaultValue={profile.display_name}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        placeholder="e.g. Storm B."
                        data-lpignore="true"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <textarea
                        name="bio"
                        defaultValue={profile.bio}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white h-24"
                        placeholder="Tell us about your Beyblade journey..."
                        data-lpignore="true" // Prevent extensions from messing with textarea
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-2 rounded font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    Save Profile
                </button>
            </form>
        </div>
    );
}
