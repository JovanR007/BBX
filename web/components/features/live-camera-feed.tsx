"use client";

import { useEffect, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { DailyProvider, useParticipantIds, DailyVideo } from "@daily-co/daily-react";
import { Loader2 } from "lucide-react";

export function LiveCameraFeed({ roomUrl }: { roomUrl: string }) {
    const [callObject, setCallObject] = useState<any>(null);

    useEffect(() => {
        if (!roomUrl) return;

        const newCallObject = DailyIframe.createCallObject({
            url: roomUrl,
            subscribeToTracksAutomatically: true,
        });
        setCallObject(newCallObject);

        // Join as viewer (no cam, no mic)
        newCallObject.join({
            url: roomUrl,
            startVideoOff: true,
            startAudioOff: true
        });

        return () => {
            newCallObject.destroy();
        };
    }, [roomUrl]);

    if (!callObject) return null;

    return (
        <DailyProvider callObject={callObject}>
            <FeedView />
        </DailyProvider>
    );
}

function FeedView() {
    // Get remote participants
    const participantIds = useParticipantIds({ filter: 'remote' });
    const broadcasterId = participantIds[0]; // Assuming one broadcaster for now

    if (!broadcasterId) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                <Loader2 className="w-16 h-16 text-red-500 animate-spin" />
                <p className="mt-4 text-white font-mono uppercase tracking-widest text-sm">Waiting for Signal...</p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            {/* Live Indicator */}
            <div className="absolute top-8 right-8 flex items-center gap-3 z-10 pointer-events-none">
                <div className="bg-red-600 text-white px-6 py-2 rounded-full animate-pulse shadow-[0_0_20px_red] flex items-center gap-3">
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span className="font-black tracking-widest text-lg">LIVE FEED</span>
                </div>
            </div>

            {/* Video Player - Full Screen */}
            <DailyVideo
                sessionId={broadcasterId}
                type="video"
                className="w-full h-full object-contain"
                fit="contain"
            />
        </div>
    );
}
