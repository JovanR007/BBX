"use client";

import React, { useMemo } from 'react';

interface BrandedContainerProps {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    children: React.ReactNode;
    className?: string;
}

export function BrandedContainer({ primaryColor, secondaryColor, children, className }: BrandedContainerProps) {
    const style = useMemo(() => {
        const customStyle: Record<string, string> = {};

        if (primaryColor) {
            customStyle['--primary'] = primaryColor;
            customStyle['--color-primary'] = primaryColor;
            customStyle['--ring'] = primaryColor;
        }

        if (secondaryColor) {
            customStyle['--secondary'] = secondaryColor;
            customStyle['--color-secondary'] = secondaryColor;
            customStyle['--accent'] = secondaryColor;
            customStyle['--color-accent'] = secondaryColor;
        }

        return customStyle as React.CSSProperties;
    }, [primaryColor, secondaryColor]);

    return (
        <div style={style} className={className}>
            {children}
        </div>
    );
}
