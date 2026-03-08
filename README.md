# 🤖 sydiscord-bot

A Discord bot built with **TypeScript** and **discord.js v14**, featuring a clean slash command architecture.

## 📁 Project Structure

```
src/
├── commands/          # Slash commands (one file per command)
│   ├── ping.ts
│   ├── help.ts
│   ├── serverinfo.ts
│   └── userinfo.ts
├── events/            # Discord event handlers
│   ├── ready.ts
│   └── interactionCreate.ts
├── utils/
│   └── deployCommands.ts  # Script to register commands with Discord
├── types/
│   └── index.ts       # Shared TypeScript interfaces
└── index.ts           # Entry point
```

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:
- `DISCORD_TOKEN` → Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
- `CLIENT_ID` → Your bot's Application ID
- `GUILD_ID` → *(Optional)* A server ID for instant slash command registration during development

### 3. Deploy slash commands

```bash
npm run deploy
```

> Set `GUILD_ID` for instant registration (dev). Leave it empty for global registration (up to 1h).

### 4. Start the bot

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

## 🛠 Adding a New Command

Create a new file in `src/commands/`:

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello!"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("👋 Hello!");
  },
};

module.exports = command;
```

Then re-run `npm run deploy` to register the new command. That's it!

## 📦 Commands

| Command | Description |
|---|---|
| `/ping` | Shows bot latency |
| `/help` | Lists all commands |
| `/serverinfo` | Shows server details |
| `/userinfo [user]` | Shows user details |
| `/ticket panel` | Publishes the public ticket panel |
| `/ticket config` | Sets category, staff role, log channel and limits |
| `/ticket stats` | Shows ticket stats and current setup |
| `/ticket claim` | Claims the current ticket |
| `/ticket add/remove` | Adds or removes users from the current ticket |
| `/ticket rename` | Renames the current ticket channel |
| `/ticket close` | Closes the current ticket with transcript logging |

## 🎫 Ticket Features

- Public panel with button-based ticket creation
- Modal flow with subject, priority and detailed issue description
- Private ticket channels with owner + optional staff role permissions
- Staff claim flow
- Ticket rename / add user / remove user / close commands
- Transcript export on closure and optional log channel delivery
- JSON-based local persistence for ticket config and counters
