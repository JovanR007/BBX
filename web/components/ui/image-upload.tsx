"use client";

import { useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toaster";
import Image from "next/image";

interface ImageUploadProps {
    value: string | null;
    onChange: (url: string) => void;
    bucketName?: string;
    label?: string;
    circular?: boolean;
}

export function ImageUpload({ value, onChange, bucketName = "avatars", label = "Upload Image", circular = false }: ImageUploadProps) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file);

        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        setPreview(publicUrl);
        onChange(publicUrl);
        setUploading(false);
    }

    return (
        <div className="flex items-center gap-4 mb-4">
            <div className={`relative w-20 h-20 overflow-hidden bg-slate-800 border border-slate-700 ${circular ? "rounded-full" : "rounded-lg"}`}>
                {preview ? (
                    <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                        <UploadCloud className="w-5 h-5 opacity-50" />
                        <span>No Img</span>
                    </div>
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin w-6 h-6 text-white" />
                    </div>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors">
                    {label}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFile} disabled={uploading} />
                </label>
                <p className="text-xs text-muted-foreground">Max 2MB. JPG/PNG.</p>
            </div>
        </div>
    );
}
