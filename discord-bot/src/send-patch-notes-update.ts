import "dotenv/config";
import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel } from "discord.js";

const ANNOUNCEMENTS_CHANNEL_ID = "1464177403336331319";

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log("Connected! Preparing patch notes...");
    const channel = await readyClient.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID) as TextChannel;

    if (!channel) {
        console.error("Announcements channel not found!");
        process.exit(1);
    }

    // --- Patch Notes Embed ---
    const patchNotesEmbed = new EmbedBuilder()
        .setColor(0xFFD700) // Gold for "Champions" vibe
        .setTitle('🏆 GLOBAL LEADERBOARDS & TOURNAMENT UPDATE')
        .setDescription("Rise and grind, Bladers! We just dropped a massive update focused on competitive rankings and tournament quality. Here’s what’s new in *BeyBracket*:")
        .setThumbnail('https://web-one-gamma-15.vercel.app/favicon.ico')
        .addFields(
            {
                name: '🏆 Global Leaderboards',
                value: 'It’s finally here. Every match you win, every tournament you conquer now earns you *Ranking Points*.\n\n• **Rank Tiers**: Climb from *Newbie* all the way to *Legend*.\n• **Global & Local Rankings**: Filter the leaderboard to see who’s the best in your *Country* or *City*.\n• **Bonus Points**: Earn extra for Top Cut appearances and Tournament Victories!'
            },
            {
                name: '📍 Profile Upgrades',
                value: '• **Location Tags**: Add your City and Country to your profile to appear on local leaderboards. Represent your scene!\n• *Note: Points are retroactive! If you\'ve been dominating, your rank might already be waiting for you.*'
            },
            {
                name: '🛠️ Tournament QoL',
                value: '• **Smart Check-Ins**: Starting a tournament now automatically removes players who haven\'t checked in. No more AFK ghosts in your bracket! 👻\n• **Clearer Brackets**: Empty slots now clearly say *"BYE"* instead of "TBD".\n• **Integrity Fixes**: Deleting a tournament now correctly removes the associated ranking points. Fair play only.'
            }
        )
        .setFooter({ text: 'The Beybracket Team' })
        .setTimestamp();

    await channel.send({ 
        content: "@everyone *UPDATE IS LIVE: The Age of Champions! 🌍*\n\nGo check your rank now! Are you a *Master* yet? 👀\nhttps://beybracket.com/leaderboard",
        embeds: [patchNotesEmbed] 
    });
    console.log("Patch notes post sent successfully.");

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
