"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TimerPage() {
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("match"); // 'match' or 'check' (3-2-1)
    const [checkCount, setCheckCount] = useState(3);
    const [showGoShoot, setShowGoShoot] = useState(false);

    // Sound settings (mock for now, could add real Audio objects)
    const [soundEnabled, setSoundEnabled] = useState(false);

    useEffect(() => {
        let interval = null;

        if (isActive && mode === "match" && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (isActive && mode === "check") {
            // 3-2-1 Sequence
            if (checkCount > 0) {
                interval = setInterval(() => {
                    setCheckCount(c => c - 1);
                }, 1000);
            } else {
                // Check complete
                setShowGoShoot(true);
                setIsActive(false);
                setTimeout(() => {
                    setShowGoShoot(false);
                    setMode("match");
                }, 2000);
            }
        } else if (timeLeft === 0) {
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, checkCount]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(180);
        setMode("match");
        setCheckCount(3);
        setShowGoShoot(false);
    };

    const startCheck = () => {
        setIsActive(true);
        setMode("check");
        setCheckCount(3);
        setShowGoShoot(false);
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            {/* Tech Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0833441a_1px,transparent_1px),linear-gradient(to_bottom,#0833441a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Go Shoot Overlay */}
            {showGoShoot && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in zoom-in duration-300">
                    <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 italic tracking-tighter drop-shadow-[0_0_50px_rgba(239,68,68,0.8)] scale-150 animate-pulse">
                        GO SHOOT!
                    </h1>
                </div>
            )}

            <div className="relative z-10 text-center space-y-12">
                {/* Mode Display */}
                {mode === "check" ? (
                    <div className="scale-150 transform transition-all duration-500">
                        <div className="text-[20rem] font-black text-white leading-none drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                            {checkCount > 0 ? checkCount : ""}
                        </div>
                        <div className="text-2xl font-mono text-cyan-400 tracking-[1rem] uppercase animate-pulse">
                            Ready Set
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className={cn(
                            "text-[15rem] font-bold font-mono leading-none tracking-tighter transition-colors duration-500",
                            timeLeft <= 10 ? "text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse" : "text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                        )}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className="text-xl text-slate-500 font-mono tracking-widest mt-4 uppercase">
                            Official Match Timer
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-6 justify-center">
                    {!isActive && mode === "match" && (
                        <button
                            onClick={startCheck}
                            className="bg-purple-600 hover:bg-purple-500 text-white w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:scale-105"
                            title="Start 3-2-1 Sequence"
                        >
                            <span className="font-black text-2xl">3-2-1</span>
                        </button>
                    )}

                    <button
                        onClick={toggleTimer}
                        className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-2xl border-4 text-white",
                            isActive
                                ? "bg-slate-900 border-slate-700 hover:border-red-500/50 hover:text-red-400"
                                : "bg-cyan-600 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                        )}
                    >
                        {isActive ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 ml-2" />}
                    </button>

                    <button
                        onClick={resetTimer}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-20 h-20 rounded-full flex items-center justify-center border border-slate-700 transition-all hover:rotate-180 duration-500"
                    >
                        <RotateCcw className="w-8 h-8" />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-8 text-slate-600 font-mono text-xs">
                BEYBRACKET.SYSTEM // TIMER_MODULE
            </div>
        </div>
    );
}
