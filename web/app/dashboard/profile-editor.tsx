"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { updateProfileAction, claimParticipantHistoryAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Save, ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileEditor({ user }: { user: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<{
        username: string,
        display_name: string,
        bio: string,
        avatar_url: string | null,
        display_name_updated_at: string | null
    }>({
        username: '',
        display_name: '',
        bio: '',
        avatar_url: null,
        display_name_updated_at: null
    });

    // Fetch existing profile on mount
    useEffect(() => {
        async function load() {
            if (!user?.id) return;
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                // Sync avatar if missing in DB but present in Stack User (passed as prop?)
                // Actually, accessing useUser hooks here is better or rely on passed user
                let avatar = data.avatar_url;

                // If local DB empty, use passed user image (which comes from Stack Server)
                if (!avatar && user.profileImageUrl) {
                    avatar = user.profileImageUrl;
                }

                setProfile({
                    username: data.username || '',
                    display_name: data.display_name || '',
                    bio: data.bio || '',
                    avatar_url: avatar || null,
                    display_name_updated_at: data.display_name_updated_at || null
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

    const [syncing, setSyncing] = useState(false);
    async function handleSync() {
        if (!confirm(`This will search for past tournaments where you played as "${profile.display_name}" and link them to your account. Continue?`)) return;

        setSyncing(true);
        const res = await claimParticipantHistoryAction();
        setSyncing(false);

        if (res.success) {
            toast({ title: "Sync Complete", description: res.message, variant: "success" });
            router.refresh();
        } else {
            toast({ title: "Sync Failed", description: res.error, variant: "destructive" });
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
                <AvatarUpload currentUrl={profile.avatar_url} onUploadComplete={(url) => setProfile(p => ({ ...p, avatar_url: url }))} />
                <input type="hidden" name="avatar_url" value={profile.avatar_url || ''} />

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
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="e.g. Storm B."
                        data-lpignore="true"
                        disabled={!!profile.display_name_updated_at && (new Date().getTime() - new Date(profile.display_name_updated_at).getTime() < 30 * 24 * 60 * 60 * 1000)}
                    />
                    {profile.display_name_updated_at && (new Date().getTime() - new Date(profile.display_name_updated_at).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                        <p className="text-xs text-red-400 mt-1">
                            You can change your display name again in {Math.ceil(30 - (new Date().getTime() - new Date(profile.display_name_updated_at).getTime()) / (1000 * 60 * 60 * 24))} days.
                        </p>
                    )}
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

            <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-bold mb-2">Account Actions</h3>
                <div className="bg-muted/30 rounded-lg p-4 border border-dashed border-slate-700">
                    <p className="text-sm text-muted-foreground mb-4">
                        Did you participate in tournaments as a guest before creating an account?
                        Sync your past stats by matching your current Display Name.
                    </p>
                    <button
                        onClick={handleSync}
                        disabled={syncing || !profile.display_name}
                        className="w-full bg-secondary text-secondary-foreground py-2 rounded font-medium hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {syncing ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Past Tournaments
                    </button>
                </div>
            </div>
        </div>
    );
}

function AvatarUpload({ currentUrl, onUploadComplete }: { currentUrl: string | null, onUploadComplete: (url: string) => void }) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(currentUrl);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        setPreview(publicUrl);
        onUploadComplete(publicUrl);
        setUploading(false);
    }

    return (
        <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                {preview ? (
                    <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Img</div>
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin w-6 h-6 text-white" />
                    </div>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 cursor-pointer text-cyan-400 hover:text-cyan-300">
                    Change Avatar
                    <input type="file" className="hidden" accept="image/*" onChange={handleFile} disabled={uploading} />
                </label>
                <p className="text-xs text-muted-foreground">Max 2MB. JPG/PNG.</p>
            </div>
        </div>
    );
}
