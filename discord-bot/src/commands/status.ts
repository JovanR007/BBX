import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { supabase } from "../utils/supabase.ts";

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of a tournament")
    .addStringOption(option =>
        option.setName("tournament_id")
            .setDescription("The ID of the tournament")
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString("tournament_id");

    await interaction.deferReply();

    try {
        const { data: tournament, error } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", tournamentId)
            .single();

        if (error || !tournament) {
            return await interaction.editReply(`Could not find tournament with ID: ${tournamentId}`);
        }

        const statusEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Tournament: ${tournament.name}`)
            .addFields(
                { name: 'Status', value: tournament.status || 'Unknown' },
                { name: 'Players', value: `${tournament.player_count || 0}` },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [statusEmbed] });
    } catch (error) {
        console.error(error);
        await interaction.editReply("There was an error fetching the tournament status.");
    }
}
