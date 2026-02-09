"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function CameraStreamer({ matchId, onClose }: { matchId: string, onClose: () => void }) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
    const channelRef = useRef<any>(null);

    // --- 1. SETUP MEDIA ---
    useEffect(() => {
        let mounted = true;

        async function startMedia() {
            try {
                const ms = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment", width: 1280, height: 720 }, // Back camera preferred
                    audio: true
                });
                if (mounted) setLocalStream(ms);
                if (videoRef.current) {
                    videoRef.current.srcObject = ms;
                }
            } catch (err) {
                console.error("Failed to get media", err);
                alert("Could not access camera/microphone.");
                onClose();
            }
        }
        startMedia();

        return () => {
            mounted = false;
            // Cleanup Media
            if (localStream) {
                localStream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // --- 2. SIGNALING ---
    useEffect(() => {
        if (!localStream) return;

        const channel = supabase.channel(`stream-${matchId}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
                console.log("Viewer joined:", payload.viewerId);
                createPeerConnection(payload.viewerId);
            })
            .on('broadcast', { event: 'answer' }, ({ payload }) => {
                handleAnswer(payload.viewerId, payload.sdp);
            })
            .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
                handleIceCandidate(payload.viewerId, payload.candidate);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Broadcaster Online. signaling ready.");
                    // Optional: Broadcast "broadcaster-online" so existing viewers can reconnect?
                }
            });

        return () => {
            Object.values(peerConnections.current).forEach(pc => pc.close());
            supabase.removeChannel(channel);
        };
    }, [localStream, matchId]);


    // --- 3. WebRTC LOGIC ---
    const createPeerConnection = async (viewerId: string) => {
        if (peerConnections.current[viewerId]) return; // Already connected

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Add Tracks
        localStream?.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        // ICE Handler
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { target: 'viewer', viewerId, candidate: event.candidate }
                });
            }
        };

        // Save
        peerConnections.current[viewerId] = pc;

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send Offer
        const { error } = await channelRef.current?.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
                target: 'viewer', // signal that this is an offer FOR a viewer
                viewerId: viewerId,
                sdp: offer
            }
        });

        if (error) console.error("Offer send error:", error);
    };

    const handleAnswer = async (viewerId: string, sdp: any) => {
        const pc = peerConnections.current[viewerId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    };

    const handleIceCandidate = async (viewerId: string, candidate: any) => {
        const pc = peerConnections.current[viewerId];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };


    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-48 bg-black rounded-lg shadow-2xl overflow-hidden border border-red-500 animate-in slide-in-from-bottom-10">
            <div className="relative aspect-video bg-slate-900">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <div className="absolute bottom-1 left-2 text-[10px] font-mono text-white/80">BROADCASTING</div>
            </div>

            <button onClick={onClose} className="w-full py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 uppercase">
                Stop Stream
            </button>
        </div>
    );
}

// Fix Syntax Error in createOffer line above "constoffer" -> "const offer"
