import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("website")
    .setDescription("Get the link to the Beybracket official website");

export async function execute(interaction: ChatInputCommandInteraction) {
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Visit Beybracket')
                .setURL('https://web-one-gamma-15.vercel.app/')
                .setStyle(ButtonStyle.Link),
        );

    await interaction.reply({
        content: 'Check out the official Beybracket platform to manage tournaments and view results!',
        components: [row]
    });
}
