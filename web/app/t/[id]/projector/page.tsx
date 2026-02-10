"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useBracketData } from "@/hooks/use-bracket-data";
import { BracketConnector } from "@/components/features/bracket-connector";
import { SingleEliminationBracket, Match as CustomMatch } from "react-tournament-brackets";
import { Match, Participant } from "@/types";
import { QRCodeDisplay } from "@/components/features/qr-code";
import { Loader2, Crown, Trophy, Maximize2, Minimize2, LogOut, Medal, Sparkles } from "lucide-react";
import { BrandedContainer } from "@/components/features/branded-container";
import Link from "next/link";

// Re-use theme from BracketPage
const BeybladeTheme = {
    textColor: { main: '#E2E8F0', highlighted: '#F8FAFC', dark: '#94A3B8', disabled: '#475569' },
    matchBackground: { wonColor: '#1e293b', lostColor: '#0f172a' },
    score: {
        background: { wonColor: '#1e293b', lostColor: '#0f172a' },
        text: { highlightedWonColor: '#22c55e', highlightedLostColor: '#ef4444' }
    },
    border: {
        color: '#334155',
        highlightedColor: '#22D3EE',
    },
    roundHeader: { backgroundColor: 'transparent', fontColor: '#94A3B8' },
    connectorColor: '#334155',
    connectorColorHighlight: '#22D3EE',
    svgBackground: 'transparent',
    fontFamily: '"Inter", sans-serif',
    transitionTimingFunction: 'ease-in-out',
    disabledColor: '#475569',
    roundHeaders: { background: 'transparent' },
    canvasBackground: 'transparent'
};

export default function ProjectorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);
    const {
        loading,
        tournament,
        matches,
        participants,
        viewMode,
        derived: {
            swissMatches,
            topCutMatches,
            winner,
            runnerUp,
            thirdPlace,
            isTournamentComplete
        }
    } = useBracketData(tournamentId);

    const [origin, setOrigin] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
