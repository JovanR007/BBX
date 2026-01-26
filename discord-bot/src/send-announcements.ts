import "dotenv/config";
import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel } from "discord.js";

const ANNOUNCEMENTS_CHANNEL_ID = "1464177403336331319";

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log("Connected! Preparing announcements...");
    const channel = await readyClient.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID) as TextChannel;

    if (!channel) {
        console.error("Announcements channel not found!");
        process.exit(1);
    }

    // --- Post 1: Introduction ---
    const introEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🚀 Welcome to Beybracket!')
        .setDescription('We are thrilled to introduce the ultimate platform for Beyblade X tournament organization and participation.')
        .setThumbnail('https://web-one-gamma-15.vercel.app/favicon.ico') // Attempting to use the site favicon
        .addFields(
            { name: '📊 Live Brackets', value: 'Follow your tournament progress with real-time bracket updates and standings.' },
            { name: '🏆 Swiss System', value: 'Experience professional-grade tournament organization featuring the Swiss system with full tie-breaker support.' },
            { name: '📱 Judge Tools', value: 'Mobile-optimized tools for judges to report scores instantly from the field.' },
            { name: '🤖 Discord Integration', value: 'Get live updates, FAQ, and support right here on Discord!' },
        )
        .setURL('https://web-one-gamma-15.vercel.app/')
        .setFooter({ text: 'The Beybracket Team' })
        .setTimestamp();

    await channel.send({ embeds: [introEmbed] });
    console.log("Introductory post sent.");

    // --- Post 2: Patch Notes ---
    const patchNotesEmbed = new EmbedBuilder()
        .setColor(0xFF8800)
        .setTitle('🛠️ Patch Notes: January 25th Update')
        .setDescription('We’ve just pushed a significant update to improve tournament fairness and the registration experience.')
        .addFields(
            {
                name: '⚖️ Scoring System Overhaul',
                value: 'We have updated our tie-breaker logic for better precision. Rankings are now determined by:\n**Points Scored** ➔ **Points Difference** ➔ **Buchholz**.'
            },
            {
                name: '✉️ Store Owner Invitations',
                value: 'Store owners can now personally invite players! \n- Requirement: Players must be registered in the app.\n- Process: Invited players become "Pre-registered" and receive a confirmation via app notifications.'
            },
            {
                name: '✅ Enhanced Check-in Flow',
                value: '- Registered users can now check themselves in.\n- Pre-registered users require a manual check-in by staff.\n- Walk-in bladers are automatically checked in upon entry.'
            },
            {
                name: '📱 Mobile Experience & Safari Fixes',
                value: '- **Logo Alignment**: Optimized the header for mobile, ensuring the logo is properly left-aligned.\n- **Safari Interactivity**: Converted the account menu to a click-based toggle for reliable performance on mobile Safari and touch devices.'
            }
        )
        .setFooter({ text: 'Version 1.1.0' })
        .setTimestamp();

    await channel.send({ embeds: [patchNotesEmbed] });
    console.log("Patch notes post sent.");

    console.log("All announcements completed successfully.");
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
