import { Client, TextChannel } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const META_CHANNEL_ID = "1464180289835110400";
const SEARCH_QUERY = "Beyblade X New Meta/Combos";
const POLL_INTERVAL = 60 * 60 * 1000; // 1 hour (save API quota)
const STORAGE_FILE = path.join(__dirname, "../../processed_videos.json");

let processedVideos: string[] = [];

if (fs.existsSync(STORAGE_FILE)) {
    try {
        processedVideos = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
    } catch (e) {
        processedVideos = [];
    }
}

export async function initYouTubeFeed(client: Client) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn("[YouTubeFeed] Missing YOUTUBE_API_KEY. YouTube feed disabled.");
        return;
    }

    console.log("Starting YouTube Feed Service...");

    setInterval(async () => {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(SEARCH_QUERY)}&type=video&order=date&maxResults=5&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json() as any;

            if (data.error) {
                console.error("YouTube API Error:", data.error.message);
                return;
            }

            const items = data.items || [];
            const channel = await client.channels.fetch(META_CHANNEL_ID) as TextChannel;

            if (!channel) {
                console.error("Meta channel not found!");
                return;
            }

            let newDetected = false;
            for (const item of items) {
                const videoId = item.id.videoId;
                if (!processedVideos.includes(videoId)) {
                    await channel.send(`🎥 **New Beyblade X Meta/Combo Video!**\nhttps://www.youtube.com/watch?v=${videoId}`);
                    processedVideos.push(videoId);
                    newDetected = true;
                }
            }

            if (newDetected) {
                // Keep the list manageable
                if (processedVideos.length > 100) {
                    processedVideos = processedVideos.slice(-100);
                }
                fs.writeFileSync(STORAGE_FILE, JSON.stringify(processedVideos));
            }

        } catch (error) {
            console.error("YouTube Feed error:", error);
        }
    }, POLL_INTERVAL);
}
