import React from 'react';
import { Match } from "@/types";

interface BracketConnectorProps {
    matches?: Match[];
    match_target_points?: number;
    previousRoundCount?: number;
    isFinals?: boolean;
}

export function BracketConnector({ matches, match_target_points, previousRoundCount }: BracketConnectorProps) {
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
        // Grid-based connector to align perfectly with the match grid
        return (
            <div className="grid w-10 shrink-0 relative" style={{ gridTemplateRows: `repeat(${previousRoundCount}, 1fr)` }}>
                {Array.from({ length: previousRoundCount }).map((_, i) => {
                    const isTop = i % 2 === 0;
                    const isBottom = i % 2 === 1;

                    return (
                        <div key={i} className="relative w-full h-full">
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                overflow="visible"
                            >
                                {isTop && (
                                    <path
                                        d="M 0 50 C 50 50 50 100 100 100"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {isBottom && (
                                    <path
                                        d="M 0 50 C 50 50 50 0 100 0"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                            </svg>
                        </div>
                    );
                })}
            </div>
        );
    }

    return null;
}
