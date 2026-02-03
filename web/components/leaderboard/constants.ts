import { Crown, Medal, Trophy, User } from "lucide-react";
import { ShieldIcon, SwordsIcon } from "@/components/icons";

export const TIER_ICONS: any = {
    "Legend": Crown,
    "Master": Trophy,
    "Elite Blader": SwordsIcon,
    "Blader": Medal,
    "Trainee": ShieldIcon,
    "Newbie": User
};

export const TIER_COLORS: any = {
    "Legend": "text-yellow-400 border-yellow-500/50 bg-yellow-950/30",
    "Master": "text-purple-400 border-purple-500/50 bg-purple-950/30",
    "Elite Blader": "text-red-400 border-red-500/50 bg-red-950/30",
    "Blader": "text-cyan-400 border-cyan-500/50 bg-cyan-950/30",
    "Trainee": "text-green-400 border-green-500/50 bg-green-950/30",
    "Newbie": "text-slate-400 border-slate-500/50 bg-slate-900/50"
};
