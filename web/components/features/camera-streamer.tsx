"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";
import Peer from "peerjs";

export function CameraStreamer({ matchId, onClose }: { matchId: string, onClose: () => void }) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const peerRef = useRef<Peer | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

    useEffect(() => {
        console.log("CameraStreamer MOUNTED for match:", matchId);

        // 1. Get Local Stream with specific facing mode
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
        })
            .then((s) => {
                setStream(s);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = s;
                }

                // 2. Initialize Peer
                const peerId = `beybracket-match-${matchId}-broadcaster`;

                // If peer already exists (e.g. from switching camera), use it or destroy?
                // PeerJS ID reuse is tricky. Better to keep peer and replace stream?
                // Replacing stream in existing call is complex. 
                // Simplest: Destroy and Re-init for now (blink)

                if (peerRef.current) peerRef.current.destroy();

                const peer = new Peer(peerId, { debug: 1 });
                peerRef.current = peer;

                peer.on('open', (id) => {
                    console.log('My peer ID is: ' + id);
                });

                peer.on('call', (call) => {
                    console.log('Incoming call from viewer', call.peer);
                    call.answer(s);
                });

                peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    if (err.type === 'unavailable-id') {
                        console.warn("Stream ID already taken.");
                    }
                });
            })
            .catch(err => {
                console.error("Failed to get local stream", err);
                onClose();
            });

        return () => {
            if (peerRef.current) peerRef.current.destroy();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [matchId, facingMode]);

    const toggleCamera = () => {
        // Stop current tracks first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setFacingMode(prev => prev === "user" ? "environment" : "user");
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-28 md:w-48 bg-black rounded-lg shadow-2xl overflow-hidden border border-red-500 animate-in slide-in-from-top-10">
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
                <button onClick={toggleCamera} className="flex-1 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 uppercase transition-colors border-r border-slate-700">
                    Switch Cam
                </button>
                <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 uppercase transition-colors">
                    Stop
                </button>
            </div>
        </div>
    );
}
