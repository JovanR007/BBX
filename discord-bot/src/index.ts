import "dotenv/config";
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import { supabase } from "./utils/supabase.ts";
import { initTournamentAnnouncer } from "./services/tournamentAnnouncer.ts";
import { initYouTubeFeed } from "./services/youtubeFeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error("Missing DISCORD_TOKEN environment variable");
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

// Command collection
(client as any).commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
        (client as any).commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Initialize services
    initTournamentAnnouncer(readyClient);
    initYouTubeFeed(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = (client as any).commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: [64] });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: [64] });
        }
    }
});

client.login(token);
