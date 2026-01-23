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
            <div className="flex items-center justify-center p-4 bg-muted/10 rounded-lg border border-white/5 mb-6 backdrop-blur-sm">
                <span className="text-sm font-medium text-muted-foreground">
                    Match Target points: <span className="text-primary font-bold">{match_target_points}</span>
                </span>
            </div>
        );
    }

    if (previousRoundCount !== undefined) {
        // Grid-based connector to align perfectly with the match grid
        return (
            <div className="grid w-full shrink-0 relative h-full" style={{ gridTemplateRows: `repeat(${previousRoundCount}, 1fr)` }}>
                {Array.from({ length: previousRoundCount }).map((_, i) => {
                    // Match pairs (0+1, 2+3, etc.) connect at their boundary
                    const isSingleMatch = previousRoundCount === 1;
                    const isTop = i % 2 === 0 && !isSingleMatch;
                    const isBottom = i % 2 === 1 && !isSingleMatch;

                    return (
                        <div key={i} className="relative w-full h-full">
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                overflow="visible"
                            >
                                {isSingleMatch && (
                                    <line
                                        x1="-30" y1="50" x2="130" y2="50"
                                        stroke="currentColor"
                                        className="text-white"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {isTop && (
                                    <path
                                        d="M -30 50 L 30 50 Q 50 50 50 75 L 50 100 M 50 100 L 130 100"
                                        fill="none"
                                        stroke="currentColor"
                                        className="text-white"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {isBottom && (
                                    <path
                                        d="M -30 50 L 30 50 Q 50 50 50 25 L 50 0 M 50 0 L 130 0"
                                        fill="none"
                                        stroke="currentColor"
                                        className="text-white"
                                        strokeWidth="3"
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
