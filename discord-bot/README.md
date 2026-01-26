# Beybracket Discord Support Bot

This bot provides support and tournament status information for the Beybracket community.

## Setup

1. **Install Dependencies**:
   ```bash
   cd discord-bot
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your details:
   - `DISCORD_TOKEN`: Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications).
   - `DISCORD_CLIENT_ID`: Your bot's Application ID (found in the "General Information" tab of your app).
   - `DISCORD_GUILD_ID`: The ID of your Discord server (Right-click server icon -> Copy Server ID. Developer Mode must be on).
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key.

3. **Register Commands**:
   Run the following command to register slash commands with Discord:
   ```bash
   npm run deploy
   ```

4. **Run the Bot**:
   ```bash
   npm run dev
   ```

## Commands

- `/support [issue]`: Submit a support request.
- `/faq`: View frequently asked questions.
- `/status [tournament_id]`: Check the status of a specific tournament.
