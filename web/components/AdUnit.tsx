'use client';

import { useEffect, useRef } from 'react';

type AdUnitProps = {
    slot: string;
    style?: React.CSSProperties;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
    layoutKey?: string;
    className?: string;
    responsive?: boolean;
};

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

export function AdUnit({ slot, style, format = 'auto', layoutKey, className, responsive = true }: AdUnitProps) {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && (window.adsbygoogle = window.adsbygoogle || [])) {
                if (adRef.current && adRef.current.innerHTML === '') {
                    (window.adsbygoogle || []).push({});
                }
            }
        } catch (err) {
            console.error('AdSense error:', err);
        }
    }, []);

    if (process.env.NEXT_PUBLIC_ENABLE_ADS !== 'true') {
        return null;
    }

    return (
        <div className={`ad-container relative my-4 flex justify-center ${className || ''}`} aria-hidden={true}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', minWidth: '300px', minHeight: '50px', ...style }}
                data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive ? "true" : "false"}
                data-ad-layout-key={layoutKey}
            />

            <div className="absolute text-[10px] text-gray-400 -mt-3 select-none">Advertisement</div>
        </div>
    );
}
