import React from 'react';
import { Match } from "@/types";

interface BracketConnectorProps {
    matches?: Match[];
    match_target_points?: number;
    previousRoundCount?: number;
    isFinals?: boolean;
}

export function BracketConnector({ matches, match_target_points, previousRoundCount, isFinals }: BracketConnectorProps) {
    if (matches) {
        return (
            <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border border-dashed mb-6">
                <span className="text-sm font-medium text-muted-foreground">
                    Match Target points: <span className="text-foreground font-bold">{match_target_points}</span>
                </span>
            </div>
        );
    }

    if (previousRoundCount !== undefined) {
        // Connector Logic:
        // We need to connect adjacent pairs from the previous round (indices 0&1, 2&3, etc.)
        // to a single point in the next round.
        // Assuming the previous round items are evenly spaced in a flex/grid setup.

        // This is a simplified connector that draws "brackets" } style.
        const pairs = Math.ceil(previousRoundCount / 2);

        return (
            <div className="hidden md:flex flex-col w-12 shrink-0 py-8 relative">
                {/* 
                    We render a column of SVGs. 
                    Actually, it's easier to render one SVG for the whole column if we know heights,
                    BUT, since our Match Cards have dynamic heights, flexbox is safer.
                    
                    Alternative strategy:
                    Render a connector div for EACH PAIR.
                 */}
                {Array.from({ length: pairs }).map((_, i) => (
                    <div key={i} className="flex-1 relative">
                        {/* The Bracket Shape */}
                        <svg className="absolute inset-0 w-full h-full" overflow="visible">
                            <path d="M0,25% H50% V75% H0" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400" vectorEffect="non-scaling-stroke" />
                            <path d="M50%,50% H100%" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400" vectorEffect="non-scaling-stroke" />
                        </svg>
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
