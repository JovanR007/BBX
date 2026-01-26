import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log("Joined Guilds:");
    client.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);

setTimeout(() => {
    console.log("Timeout reached. Bot might not be able to connect.");
    process.exit(1);
}, 10000);
