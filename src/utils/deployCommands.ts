import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";
import { BotCommand } from "../types/index.js";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // optional: deploy to a specific guild (instant)

if (!token || !clientId) {
  console.error("❌ DISCORD_TOKEN or CLIENT_ID missing from .env");
  process.exit(1);
}

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

const commandsPath = join(__dirname, "../commands");
const isRuntimeModuleFile = (file: string) =>
  file.endsWith(".js") || (file.endsWith(".ts") && !file.endsWith(".d.ts"));

const commandFiles = readdirSync(commandsPath).filter(isRuntimeModuleFile);

for (const file of commandFiles) {
  const command: BotCommand = require(join(commandsPath, file));
  if ("data" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Queued: /${command.data.name}`);
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`\n📡 Deploying ${commands.length} slash command(s)...`);

    let data: unknown;

    if (guildId) {
      // Guild deploy (instant, great for development)
      data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`✅ Deployed to guild ${guildId}`);
    } else {
      // Global deploy (up to 1 hour to propagate)
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log("✅ Deployed globally (may take up to 1h to propagate)");
    }

    console.log(`🎉 Done! Registered ${(data as unknown[]).length} command(s)\n`);
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();
