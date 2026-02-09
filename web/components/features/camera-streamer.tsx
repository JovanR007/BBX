"use client";

import { useEffect, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { DailyProvider, useLocalParticipant, DailyVideo } from "@daily-co/daily-react";
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function CameraStreamer({ roomUrl, onClose }: { roomUrl: string, onClose: () => void }) {
    const [callObject, setCallObject] = useState<any>(null);

    useEffect(() => {
        const newCallObject = DailyIframe.createCallObject({
            url: roomUrl,
        });
        setCallObject(newCallObject);

        // Join with video/audio on
        newCallObject.join({ url: roomUrl });

        return () => {
            newCallObject.destroy();
        };
    }, [roomUrl]);

    if (!callObject) return null;

    return (
        <DailyProvider callObject={callObject}>
            <BroadcasterView onClose={onClose} />
        </DailyProvider>
    );
}

function BroadcasterView({ onClose }: { onClose: () => void }) {
    const localParticipant = useLocalParticipant();

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-48 bg-black rounded-lg shadow-2xl overflow-hidden border border-red-500 animate-in slide-in-from-bottom-10">
            <div className="relative aspect-video bg-slate-900">
                {localParticipant ? (
                    <DailyVideo sessionId={localParticipant.session_id} type="video" className="w-full h-full object-cover" automirror />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                    </div>
                )}

                <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
                <div className="absolute bottom-1 left-2 text-[10px] font-mono text-white/80 font-bold bg-black/50 px-1 rounded">BROADCASTING</div>
            </div>

            <div className="flex bg-slate-900 border-t border-slate-800">
                <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 uppercase transition-colors">
                    Stop Stream
                </button>
            </div>
        </div>
    );
}
