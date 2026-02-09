"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";
import Peer from "peerjs";

export function CameraStreamer({ matchId, onClose }: { matchId: string, onClose: () => void }) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const peerRef = useRef<Peer | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // 1. Get Local Stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then((s) => {
                setStream(s);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = s;
                }

                // 2. Initialize Peer
                // ID Scheme: beybracket-match-{matchId}-broadcaster
                // We use a specific ID so viewers know who to call.
                const peerId = `beybracket-match-${matchId}-broadcaster`;

                // Note: In production, you might want a TURN server for better connectivity.
                // We are using the default public PeerJS cloud for free signaling.
                const peer = new Peer(peerId, {
                    debug: 1
                });
                peerRef.current = peer;

                peer.on('open', (id) => {
                    console.log('My peer ID is: ' + id);
                });

                peer.on('call', (call) => {
                    console.log('Incoming call from viewer', call.peer);
                    // Answer the call with our stream
                    call.answer(s);
                });

                peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    if (err.type === 'unavailable-id') {
                        // This usually means we (or someone else) is already streaming on this ID.
                        // We could try to reconnect or just assume we are good?
                        // For now let's alert.
                        console.warn("Stream ID already taken. Are you already streaming?");
                    }
                });
            })
            .catch(err => {
                console.error("Failed to get local stream", err);
                onClose();
            });

        return () => {
            // Cleanup
            if (peerRef.current) {
                peerRef.current.destroy();
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [matchId]);

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-48 bg-black rounded-lg shadow-2xl overflow-hidden border border-red-500 animate-in slide-in-from-bottom-10">
            <div className="relative aspect-video bg-slate-900">
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover -scale-x-100" // Mirror local view
                />

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
