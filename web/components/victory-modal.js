
"use client";

import { Trophy, Medal, Crown, X, Share2, Camera, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";

export function VictoryModal({ isOpen, onClose, winner, runnerUp, thirdPlace, swissKing, tournamentName, organizerName }) {
    const [showConfetti, setShowConfetti] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    async function handleDownload() {
        if (!modalRef.current) return;
        try {
            const dataUrl = await toPng(modalRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                filter: (node) => !node.classList?.contains('no-export')
            });
            const link = document.createElement("a");
            link.download = `${tournamentName || "tournament"}-results.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Download failed", err);
            alert("Could not generate image. Please try a manual screenshot.");
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-fall"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                animationDuration: `${Math.random() * 3 + 2}s`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        >
                            <div
                                className="w-2 h-2 rotate-45 transform"
                                style={{ backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32', '#3B82F6'][Math.floor(Math.random() * 4)] }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div ref={modalRef} className="relative w-full max-w-4xl bg-slate-950 border-2 border-yellow-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header Background */}
                <div className="absolute top-0 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900/50 to-transparent pointer-events-none" />

                {/* Text Content - Swapped as requested */}
                <div className="relative pt-12 pb-4 text-center space-y-2 z-10 px-4">
                    <div className="inline-flex p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-2 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                        <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-500" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm uppercase">
                            {tournamentName || "Tournament Complete"}
                        </h2>
                        <p className="text-muted-foreground font-medium tracking-wide uppercase text-sm md:text-base">
                            {organizerName || "Official Result"}
                        </p>
                    </div>
                </div>

                {/* Podium Section - Added margin top to clear header text properly */}
                {/* Podium Section - Increased Margin Top significantly */}
                <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col items-center gap-8 md:gap-12 mt-20">

                    <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 w-full mt-4">

                        {/* 2nd Place */}
                        <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-backwards">
                            <div className="relative flex flex-col items-center w-full">
                                <Crown className="w-8 h-8 text-slate-400 mb-2 opacity-50 absolute -top-12" />
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-slate-400/30 bg-slate-400/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(148,163,184,0.1)]">
                                    <span className="text-3xl font-black text-slate-400">2</span>
                                </div>
                                <div className="bg-slate-900/50 w-full p-4 rounded-xl border border-slate-400/20 text-center relative overflow-hidden">
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-400/50" />
                                    <div className="font-bold text-lg md:text-xl truncate text-slate-200">{runnerUp?.display_name || "TBD"}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Runner Up</div>
                                </div>
                            </div>
                        </div>

                        {/* 1st Place - Center */}
                        <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 -mt-8 md:-mt-16 z-20 animate-in slide-in-from-bottom-12 duration-700">
                            <div className="relative flex flex-col items-center w-full transform md:scale-110">
                                <Crown className="w-12 h-12 text-yellow-400 mb-2 animate-bounce-slow drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-yellow-900/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(234,179,8,0.2)] ring-4 ring-yellow-500/10">
                                    <span className="text-5xl font-black text-yellow-400">1</span>
                                </div>
                                <div className="bg-slate-900/80 w-full p-6 rounded-xl border border-yellow-500/30 text-center relative overflow-hidden shadow-2xl backdrop-blur-sm">
                                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-yellow-500" />
                                    <div className="font-black text-2xl md:text-3xl truncate text-yellow-500 drop-shadow-sm">{winner?.display_name || "TBD"}</div>
                                    <div className="text-xs font-bold text-yellow-600/70 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
                                        <Trophy className="w-3 h-3" /> Champion
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 flex flex-col items-center w-full md:w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-backwards">
                            <div className="relative flex flex-col items-center w-full">
                                <Crown className="w-8 h-8 text-amber-700 mb-2 opacity-50 absolute -top-12" />
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-amber-700/30 bg-amber-700/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(180,83,9,0.1)]">
                                    <span className="text-3xl font-black text-amber-700">3</span>
                                </div>
                                <div className="bg-slate-900/50 w-full p-4 rounded-xl border border-amber-700/20 text-center relative overflow-hidden">
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-700/50" />
                                    <div className="font-bold text-lg md:text-xl truncate text-slate-200">{thirdPlace?.display_name || "TBD"}</div>
                                    <div className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest mt-1">3rd Place</div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Swiss King Section */}
                    {swissKing && (
                        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 delay-500 duration-700 fill-mode-backwards mt-4">
                            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Medal className="w-24 h-24 text-blue-500 transform rotate-12" />
                                </div>
                                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30 text-blue-400">
                                    <Medal className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Swiss King (Top Seed)</div>
                                    <div className="font-bold text-lg text-slate-200">{swissKing.display_name}</div>
                                    <div className="text-xs text-slate-400">{swissKing.match_wins} Wins • {swissKing.buchholz} Buchholz</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Advertisement / Watermark - Made more visible and positioned for export */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 pointer-events-none">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-500">Powered by BeyBracket</span>
                </div>

                {/* Footer Controls */}
                <div className="no-export p-4 border-t border-slate-800/50 bg-black/40 flex justify-between items-center text-xs text-muted-foreground z-50 relative">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10"
                    >
                        <Download className="w-4 h-4" />
                        <span>Save Image</span>
                    </button>
                    <button onClick={onClose} className="hover:text-white transition-colors flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/5">
                        Close <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .animate-fall {
                    animation-name: fall;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
                .animate-bounce-slow {
                    animation: bounce 3s infinite;
                }
            `}</style>
        </div>
    );
}
