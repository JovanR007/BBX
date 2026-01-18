export function BracketConnector({ previousRoundCount, isFinals }) {
    if (!previousRoundCount || previousRoundCount < 2) return null;

    // If it's the connection TO the finals (i.e. Semi -> Final),
    // next round technically has 2 matches (Final + 3rd Place),
    // but the tree structure only flows into the Final (Match 1).
    // The Final is the 1st item (index 0) of 2 items.

    // Normal case: Next Round has Prev/2 items.
    const nextRoundCount = isFinals ? 2 : previousRoundCount / 2;
    const paths = [];

    // We assume the container height is 100%.
    // Positions are percentages.

    // Previous Round (Left Side) has 'previousRoundCount' items.
    // Each item i (0 to N-1) is centered at (2i + 1) / 2N

    // Next Round (Right Side) has 'nextRoundCount' items.
    // Each item j (0 to M-1) is centered at (2j + 1) / 2M

    // Loop for the "Main Bracket" matches
    // If Finals, we only want to draw lines for the 1st match (The Winner's Final)
    const iterations = isFinals ? 1 : nextRoundCount;

    for (let j = 0; j < iterations; j++) {
        // The j-th match in the next round connects to 2*j and 2*j + 1 in the previous round.

        // Source Indices
        const srcTopIdx = 2 * j;
        const srcBotIdx = 2 * j + 1;

        // Source Y positions (0.0 to 1.0)
        const ySrcTop = (2 * srcTopIdx + 1) / (2 * previousRoundCount);
        const ySrcBot = (2 * srcBotIdx + 1) / (2 * previousRoundCount);

        // Dest Y position (0.0 to 1.0)
        const yDest = (2 * j + 1) / (2 * nextRoundCount);

        // Draw Path (using percentages directly in SVG)
        // Move to (0, ySrcTop) -> Curve/Line to (50%, yDest) -> Line to (100%, yDest)
        // And (0, ySrcBot) -> ...

        // Actually, standard bracket shape is:
        //      ________
        //     |
        // ____|
        //     |________

        // Coordinates:
        // x=0, y=ySrcTop  -->  x=50%, y=ySrcTop  -->  x=50%, y=yDest  -->  x=100%, y=yDest
        // x=0, y=ySrcBot  -->  x=50%, y=ySrcBot  -->  x=50%, y=yDest  -->  x=100%, y=yDest

        const yTopPct = ySrcTop * 100;
        const yBotPct = ySrcBot * 100;
        const yDestPct = yDest * 100;

        // Path for Top Branch
        // Bezier Curve Logic for smooth "S" shape
        // Control Point 1: (50%, StartY)
        // Control Point 2: (50%, DestY)
        // This creates a smooth curve that starts horizontal, bends, and ends horizontal.
        paths.push(
            `M 0 ${yTopPct} C 50 ${yTopPct}, 50 ${yDestPct}, 100 ${yDestPct}`
        );

        paths.push(
            `M 0 ${yBotPct} C 50 ${yBotPct}, 50 ${yDestPct}, 100 ${yDestPct}`
        );
    }

    return (
        <div className="w-16 self-stretch flex flex-col flex-shrink-0 relative">
            {/* Header Clone: Exact same classes as BracketPage header to guarantee identical height */}
            <div className="text-center font-bold text-transparent uppercase tracking-wider h-6 mb-4 select-none">
                Round X
            </div>

            <div className="flex-grow relative w-full">
                <svg className="w-full h-full absolute inset-0 text-primary/60 drop-shadow-[0_0_5px_rgba(var(--primary),0.4)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {paths.map((d, i) => (
                        <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
