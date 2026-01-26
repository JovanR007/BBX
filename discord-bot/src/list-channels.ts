import "dotenv/config";
import { Client, GatewayIntentBits, Events } from "discord.js";

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log("Connected!");
    const guild = readyClient.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    if (!guild) {
        console.error("Guild not found!");
        process.exit(1);
    }

    console.log(`Channels in ${guild.name}:`);
    guild.channels.cache.forEach(channel => {
        console.log(`- ${channel.name} (${channel.id}) [Type: ${channel.type}]`);
    });

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
