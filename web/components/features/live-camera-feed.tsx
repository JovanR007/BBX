"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Peer from "peerjs";

export function LiveCameraFeed({ matchId }: { matchId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer | null>(null);
    const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting");
    const [retryCount, setRetryCount] = useState(0);

    const forceReconnect = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        setStatus("connecting");
        setRetryCount(prev => prev + 1);
    };

    useEffect(() => {
        if (!matchId) return;

        let retryTimeout: NodeJS.Timeout;
        const broadcasterId = `beybracket-match-${matchId}-broadcaster`;
        console.log("Attempting to connect to:", broadcasterId);

        // Initialize Peer
        const peer = new Peer({ debug: 1 });
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('My Viewer ID:', id);
            connectToBroadcaster();
        });

        function connectToBroadcaster() {
            if (!peer || peer.destroyed) return;

            // Dummy steam for compatibility
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 1;
            const stream = canvas.captureStream();

            console.log("Calling broadcaster...");
            const call = peer.call(broadcasterId, stream);
            handleCall(call);
        }

        peer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            if (err.type === 'peer-unavailable') {
                setStatus("connecting");
                console.log("Broadcaster not found, retrying in 2s...");
                retryTimeout = setTimeout(connectToBroadcaster, 2000);
            } else {
                setStatus("failed");
            }
        });

        function handleCall(call: any) {
            if (!call) return;

            call.on('stream', (remoteStream: MediaStream) => {
                console.log("Received Remote Stream");
                if (videoRef.current) {
                    videoRef.current.srcObject = remoteStream;
                    setStatus("connected");
                }
            });

            call.on('close', () => {
                console.log("Call ended by remote");
                setStatus("connecting");
                // Retry if connection drops
                retryTimeout = setTimeout(connectToBroadcaster, 2000);
            });

            call.on('error', (e: any) => {
                console.error("Call error:", e);
                setStatus("connecting");
            });
        }

        return () => {
            clearTimeout(retryTimeout);
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
        };
    }, [matchId, retryCount]); // Depend on retryCount to trigger re-run

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            {/* Live Indicator */}
            <div className="absolute top-8 right-8 flex items-center gap-3 z-10 pointer-events-none">
                <div className="bg-red-600 text-white px-6 py-2 rounded-full animate-pulse shadow-[0_0_20px_red] flex items-center gap-3">
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span className="font-black tracking-widest text-lg">LIVE FEED</span>
                </div>
            </div>

            {/* Video Player */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
            />

            {status === 'connecting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-16 h-16 text-red-500 animate-spin" />
                    <p className="mt-4 text-white font-mono uppercase tracking-widest">Connecting to Ringside...</p>
                </div>
            )}

            {status === 'failed' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                    <p className="text-white font-mono uppercase tracking-widest text-red-500 mb-4">Connection Failed</p>
                    <button
                        onClick={forceReconnect}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full border border-slate-600 transition-all active:scale-95"
                    >
                        Force Reconnect
                    </button>
                </div>
            )}

            {/* Invisible hover area for controls if needed, or just a small button always visible */}
            <div className="absolute bottom-4 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity">
                <button
                    onClick={forceReconnect}
                    className="p-2 bg-black/50 hover:bg-black/80 text-white text-xs rounded border border-white/10 backdrop-blur-sm"
                >
                    Diff Reconnect
                </button>
            </div>
        </div>
    )
}
