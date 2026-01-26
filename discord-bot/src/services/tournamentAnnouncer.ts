import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { supabase } from "../utils/supabase.ts";

const TOURNAMENT_LIST_CHANNEL_ID = "1464179631275114633";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

let lastCheckTime = new Date().toISOString();

export async function initTournamentAnnouncer(client: Client) {
    console.log("Starting Tournament Announcer Service...");

    // Initial check on startup to avoid announcing existing tournaments
    // (Optional: if you want it to catch up, set lastCheckTime to an earlier date)

    setInterval(async () => {
        try {
            const { data: newTournaments, error } = await supabase
                .from("tournaments")
                .select("*")
                .gt("created_at", lastCheckTime)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error polling tournaments:", error);
                return;
            }

            if (newTournaments && newTournaments.length > 0) {
                const channel = await client.channels.fetch(TOURNAMENT_LIST_CHANNEL_ID) as TextChannel;
                if (!channel) {
                    console.error("Tournament list channel not found!");
                    return;
                }

                for (const tournament of newTournaments) {
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(`🏆 New Tournament: ${tournament.name}`)
                        .setURL(`https://web-one-gamma-15.vercel.app/t/${tournament.id}`) // Adjust URL as needed
                        .addFields(
                            { name: 'Status', value: tournament.status || 'Upcoming', inline: true },
                            { name: 'Rounds', value: `${tournament.swiss_rounds || 0}`, inline: true },
                            { name: 'Format', value: 'Swiss', inline: true },
                        )
                        .setTimestamp(new Date(tournament.created_at))
                        .setFooter({ text: 'Beybracket Automatic Updates' });

                    await channel.send({ embeds: [embed] });

                    // Update lastCheckTime to the latest one we processed
                    if (new Date(tournament.created_at) > new Date(lastCheckTime)) {
                        lastCheckTime = tournament.created_at;
                    }
                }
            }
        } catch (error) {
            console.error("Tournament Announcer error:", error);
        }
    }, POLL_INTERVAL);
}
