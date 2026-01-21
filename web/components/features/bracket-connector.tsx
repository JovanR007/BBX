import React from 'react';
import { Match } from "@/types";

interface BracketConnectorProps {
    matches?: Match[];
    match_target_points?: number;
    previousRoundCount?: number;
    isFinals?: boolean;
}

export function BracketConnector({ matches, match_target_points, previousRoundCount, isFinals }: BracketConnectorProps) {
    // Mode 1: Swiss Banner (if matches provided)
    if (matches) {
        return (
            <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border border-dashed mb-6">
                <span className="text-sm font-medium text-muted-foreground">
                    Match Target points: <span className="text-foreground font-bold">{match_target_points}</span>
                </span>
            </div>
        );
    }

    // Mode 2: Top Cut Connector Lines (if previousRoundCount provided)
    if (previousRoundCount !== undefined) {
        return (
            <div className="hidden md:flex w-16 h-full flex-col justify-around py-8">
                {Array.from({ length: Math.ceil(previousRoundCount / 2) }).map((_, i) => (
                    <div key={i} className="flex-1 border-r-2 border-primary/20 rounded-r-lg my-4 relative">
                        <div className="absolute top-0 right-0 w-2 h-px bg-primary/20" />
                        <div className="absolute bottom-0 right-0 w-2 h-px bg-primary/20" />
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
