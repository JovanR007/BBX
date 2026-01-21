import { useState } from "react";
import { proceedToTopCutAction, advanceBracketAction, autoScoreRoundAction, resetRoundAction, endTournamentAction } from "@/app/actions";
import { useToast } from "@/components/ui/toaster";

export interface ConfirmState {
    isOpen: boolean;
    type: 'advance' | 'proceed' | null;
    data: any | null;
    title?: string;
    description?: string;
}

export function useBracketActions(tournamentId: string | undefined, refresh: () => void) {
    const { toast } = useToast();
    const [advancing, setAdvancing] = useState(false);
    const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, type: null, data: null });
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [concludePinOpen, setConcludePinOpen] = useState(false);

    async function handleAdvanceCheck(currentRound: number) {
        setConfirmState({
            isOpen: true,
            type: 'advance',
            data: currentRound,
            title: `Start Round ${currentRound + 1}?`,
            description: "Ensure all matches in the current round are completed and scores are verified. This action cannot be undone."
        });
    }

    async function handleProceedCheck() {
        setConfirmState({
            isOpen: true,
            type: 'proceed',
            data: null,
            title: "Proceed to Elimination Stage?",
            description: "This will end the Swiss Stage and generate the Top Cut bracket based on final standings. Are you sure?"
        });
    }

    async function executeConfirmation() {
        if (!tournamentId) return;
        setAdvancing(true);
        const { type, data } = confirmState;

        let res;
        if (type === 'advance') {
            res = await advanceBracketAction(tournamentId);
        } else if (type === 'proceed') {
            res = await proceedToTopCutAction(tournamentId);
        }

        if (res?.success) {
            toast({
                title: type === 'advance' ? "Round Started" : "Stage Advanced",
                description: type === 'advance' ? `Round ${Number(data) + 1} generated successfully.` : "Top Cut bracket generated.",
                variant: "success"
            });
            refresh();
        } else {
            toast({ title: "Error", description: res?.error || "Unknown error", variant: "destructive" });
        }

        setAdvancing(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }

    async function handleAutoScore() {
        if (!tournamentId) return;
        if (!confirm("Start Debug Auto-Score? This will finish all pending matches in this round.")) return;

        setAdvancing(true);
        const res = await autoScoreRoundAction(tournamentId);
        setAdvancing(false);

        if (res.success) {
            toast({ title: "Auto-Score Complete", description: `Scored ${res.count} matches.` });
            refresh();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    }

    async function handleResetRound() {
        if (!tournamentId) return;
        if (!confirm("RESET ROUND? This will DELETE the latest Top Cut round matches. useful for fixing bugs.")) return;

        setAdvancing(true);
        const res = await resetRoundAction(tournamentId);
        setAdvancing(false);

        if (res.success) {
            toast({ title: "Round Reset", description: res.message });
            refresh();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    }

    async function handleConclude(pin: string) {
        if (!tournamentId) return;
        setAdvancing(true);
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("admin_pin", pin);

        const res = await endTournamentAction(formData);
        if (res.success) {
            setConcludePinOpen(false);
            toast({ title: "Tournament Concluded", description: "Status set to Complete.", variant: "success" });
            refresh();
            setTimeout(() => setShowVictoryModal(true), 500);
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setAdvancing(false);
    }

    return {
        advancing,
        confirmState,
        showVictoryModal,
        concludePinOpen,
        setConfirmState,
        setShowVictoryModal,
        setConcludePinOpen,
        handleAdvanceCheck,
        handleProceedCheck,
        executeConfirmation,
        handleAutoScore,
        handleResetRound,
        handleConclude
    };
}
