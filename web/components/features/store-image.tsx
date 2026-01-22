"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import Image from "next/image";

export default function StoreImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
    const [error, setError] = useState(false);

    if (src && !error) {
        return (
            <Image
                src={src}
                alt={alt}
                className={className}
                onError={() => setError(true)}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
            />
        );
    }

    return (
        <div className="bg-primary/10 text-primary p-6 rounded-xl w-full h-full flex items-center justify-center">
            <Store className="w-12 h-12" />
        </div>
    );
}
