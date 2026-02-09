"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export function LiveCameraFeed({ matchId, isActive }: { matchId: string, isActive: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);
    const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting");
    const [viewerId] = useState(() => Math.random().toString(36).substring(7)); // Unique session ID

    useEffect(() => {
        if (!isActive) return;

        console.log("Starting Viewer:", viewerId, "for match", matchId);

        // 1. Setup Peer Connection
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
            console.log("Received Remote Track:", event.streams[0]);
            if (videoRef.current) {
                videoRef.current.srcObject = event.streams[0];
                setStatus("connected");
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { target: 'broadcaster', viewerId, candidate: event.candidate }
                });
            }
        };

        // 2. Setup Signaling
        const channel = supabase.channel(`stream-${matchId}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'offer' }, async ({ payload }) => {
                // Only process offers meant for US (or broadcast if logic dictates, but we use targeted)
                if (payload.target === 'viewer' && payload.viewerId === viewerId) {
                    console.log("Received Offer");
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    channel.send({
                        type: 'broadcast',
                        event: 'answer',
                        payload: { target: 'broadcaster', viewerId, sdp: answer }
                    });
                }
            })
            .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                if (payload.target === 'viewer' && payload.viewerId === viewerId) {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Viewer Online. Announcing presence...");
                    // Announce to Broadcaster so they can call us
                    channel.send({
                        type: 'broadcast',
                        event: 'viewer-join',
                        payload: { viewerId }
                    });
                }
            });

        return () => {
            console.log("Cleaning up Viewer");
            pc.close();
            supabase.removeChannel(channel);
        };
    }, [matchId, isActive, viewerId]);


    if (!isActive) return null;

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            {/* Live Indicator */}
            <div className="absolute top-8 right-8 flex items-center gap-3 z-10">
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
                muted // Muted by default for autoplay policies, maybe adding unmute button later
                className="w-full h-full object-contain"
            />

            {status === 'connecting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-16 h-16 text-red-500 animate-spin" />
                    <p className="mt-4 text-white font-mono uppercase tracking-widest">Connecting to Arena...</p>
                </div>
            )}
        </div>
    )
}
