"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Peer from "peerjs";

export function LiveCameraFeed({ matchId }: { matchId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer | null>(null);
    const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting");

    useEffect(() => {
        if (!matchId) return;

        // ID of the broadcaster we want to call
        const broadcasterId = `beybracket-match-${matchId}-broadcaster`;
        console.log("Attempting to connect to:", broadcasterId);

        // Initialize Peer (we are the viewer, ID can be random)
        const peer = new Peer({
            debug: 1
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('My Viewer ID:', id);

            // Initiate call to broadcaster
            // We send no stream (undefined) because we are just viewing
            // PeerJS might require a stream to call? No, allows one-way.
            // Actually, `call` requires a media stream usually? 
            // Docs: `peer.call(id, stream, [options])`
            // If we don't have a stream, we can pass a dummy stream or check if it allows null.
            // PeerJS often expects a local stream.
            // Let's try creating a dummy audio-only stream or just empty?
            // A better way for one-way is usually for the broadcaster to call us?
            // BUT we don't know the viewer IDs easily.
            // Standard PeerJS pattern: Call with dummy stream or `createMediaStreamDestination`.

            // Hack: Create a dummy stream (black silent) to satisfy the API if needed,
            // OR just try passing null/undefined if supported by version.
            // Checking docs... usually requires stream.
            // Let's try to just connect a data connection first to signal "I'm here"?
            // Or simpler: The "receiving" side (Broadcaster) answers.

            // Let's try creating a receive-only call.
            // Actually PeerJS `call` method signature is `call(peerId, stream, options)`.
            // Providing a dummy stream is safest.
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 1;
            const stream = canvas.captureStream();
            const call = peer.call(broadcasterId, stream);

            handleCall(call);
        });

        peer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            // If peer-unavailable, it means judge isn't streaming yet.
            if (err.type === 'peer-unavailable') {
                setStatus("connecting"); // Keep trying? Or failed?
                // Retry logic could go here
                setTimeout(() => {
                    // Simple retry by forcing re-render or just re-calling?
                    // For now, let's just leave it pending.
                }, 2000);
            } else {
                setStatus("failed");
            }
        });

        function handleCall(call: any) {
            call.on('stream', (remoteStream: MediaStream) => {
                console.log("Received Remote Stream");
                if (videoRef.current) {
                    videoRef.current.srcObject = remoteStream;
                    setStatus("connected");
                }
            });

            call.on('close', () => {
                console.log("Call ended");
                setStatus("connecting"); // Maybe they restart?
            });

            call.on('error', (e: any) => console.error(e));
        }

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, [matchId]);

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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <p className="text-white font-mono uppercase tracking-widest text-red-500">Connection Failed</p>
                </div>
            )}
        </div>
    )
}
