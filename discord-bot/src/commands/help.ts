import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("View all available commands and how to use them");

export async function execute(interaction: ChatInputCommandInteraction) {
    const helpEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Beybracket Bot Help Guide')
        .setDescription('Welcome! Here is a list of all commands you can use with this bot:')
        .addFields(
            { name: '`/support [issue]`', value: 'Submit a support ticket or request help for a specific issue.' },
            { name: '`/status [tournament_id]`', value: 'Check the real-time status of a tournament (pairings, player count, etc.).' },
            { name: '`/faq`', value: 'Browse frequently asked questions about Beybracket.' },
            { name: '`/website`', value: 'Get a direct link to the Beybracket platform.' },
            { name: '`/help`', value: 'Display this help guide.' },
        )
        .setFooter({ text: 'Beybracket Support Team' })
        .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });
}
