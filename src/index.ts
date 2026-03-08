import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";
import { BotCommand, BotEvent, ExtendedClient } from "./types/index.js";
import { TicketStore } from "./utils/ticketStore.js";

dotenv.config();

// ─── Client Setup ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
}) as ExtendedClient;

client.commands = new Collection<string, BotCommand>();
client.ticketStore = new TicketStore();

// ─── Load Commands ────────────────────────────────────────────────────────────
const commandsPath = join(__dirname, "commands");
const isRuntimeModuleFile = (file: string) =>
  file.endsWith(".js") || (file.endsWith(".ts") && !file.endsWith(".d.ts"));

const commandFiles = readdirSync(commandsPath).filter(isRuntimeModuleFile);

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command: BotCommand = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipping ${file}: missing "data" or "execute" property`);
  }
}

// ─── Load Events ─────────────────────────────────────────────────────────────
const eventsPath = join(__dirname, "events");
const eventFiles = readdirSync(eventsPath).filter(isRuntimeModuleFile);

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event: BotEvent = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`✅ Loaded event: ${event.name}`);
}

// ─── Login ────────────────────────────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN is missing from .env");
  process.exit(1);
}

client.login(token);
