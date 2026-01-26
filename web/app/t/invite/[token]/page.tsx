import { getInviteByTokenAction } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import { stackServerApp } from "@/lib/stack";
import { InviteCard } from "./invite-card";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tournament Invitation | BBX",
    description: "You have been invited to join a tournament.",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { success, invite, error } = await getInviteByTokenAction(token);

    if (!success || !invite) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Invite</h1>
                <p className="text-muted-foreground">{error || "This invite link is invalid or has expired."}</p>
            </div>
        );
    }

    const user = await stackServerApp.getUser();

    // If accepted, redirect to tournament immediately? 
    // Maybe show "Already Joined" message with button.
    if (invite.status === 'accepted') {
        redirect(`/t/${invite.tournament_id}`);
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
            <InviteCard
                invite={invite}
                user={user ? { id: user.id, displayName: user.displayName, primaryEmail: user.primaryEmail } : null}
            />
        </div>
    );
}
