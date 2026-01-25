import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Frequently Asked Questions");

export async function execute(interaction: ChatInputCommandInteraction) {
    const faqEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Beybracket FAQ')
        .addFields(
            { name: '🏆 How do I join a tournament?', value: 'Visit our [website](https://web-one-gamma-15.vercel.app/) to find local tournaments. Once you find one, click "Join" and follow the registration steps. Make sure you check-in at the venue!' },
            { name: '⚖️ How are scores calculated?', value: 'We primarily use the **Swiss System**. You get points for wins and draws. Tie-breakers are calculated using Buchholz or Opponent Win Percentage (OWP).' },
            { name: '⏰ What if I am late?', value: 'Players who are late for a round may receive a loss for that round. If you miss two rounds, you may be automatically dropped from the tournament.' },
            { name: '🔧 Equipment Requirements', value: 'Please bring your own Beyblades that meet current tournament regulations. Custom or modified parts are generally not allowed unless specified.' },
            { name: '🐞 Found a bug?', value: 'Use the `/support` command right here on Discord or report it on the website. We appreciate your feedback!' },
            { name: '🏠 How to host a tournament?', value: 'Go to the "Create" section on our website. You can set up your own store, manage players, and run your own brackets for free.' },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [faqEmbed] });
}
