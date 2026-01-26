import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("support")
    .setDescription("Get help with Beybracket")
    .addStringOption(option =>
        option.setName("issue")
            .setDescription("Describe your issue")
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const issue = interaction.options.getString("issue");

    // In a real scenario, this might create a ticket in Supabase or a private thread
    await interaction.reply({
        content: `Your support request has been received: "${issue}"\nOne of our staff members will get back to you soon!`,
        flags: [64] // Ephemeral message
    });
}
