import { Message } from "discord.js";
import { BotEvent } from "../types/index.js";
import { handleAutomodMessage } from "../utils/automodSystem.js";
import { handleLevelingMessage } from "../utils/levelsSystem.js";

const event: BotEvent = {
  name: "messageCreate",
  async execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const violated = await handleAutomodMessage(message);
    if (violated) return;

    await handleLevelingMessage(message);
  },
};

module.exports = event;
