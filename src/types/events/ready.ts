import { Client, ActivityType } from "discord.js";
import { BotEvent } from "../types/index.js";

const event: BotEvent = {
  name: "ready",
  once: true,
  execute(client: Client) {
    if (!client.user) return;

    console.log(`\n🤖 Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)\n`);

    client.user.setPresence({
      activities: [
        {
          name: "slash commands",
          type: ActivityType.Listening,
        },
      ],
      status: "online",
    });
  },
};

module.exports = event;
