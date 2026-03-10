import { EmbedBuilder, Message } from "discord.js";
import { ExtendedClient } from "../types/index.js";

export const getLevelFromXp = (xp: number): number => {
  if (xp <= 0) return 0;
  return Math.floor(Math.sqrt(xp / 100));
};

export const getNextLevelXp = (level: number): number => {
  const nextLevel = Math.max(1, level + 1);
  return nextLevel * nextLevel * 100;
};

export const handleLevelingMessage = async (message: Message): Promise<void> => {
  if (!message.guild || message.author.bot) return;

  const client = message.client as ExtendedClient;
  const config = client.levelsStore.getConfig(message.guild.id);
  if (!config.enabled) return;

  const userState = client.levelsStore.getUser(message.guild.id, message.author.id);

  const now = Date.now();
  const last = userState.lastMessageAt ? new Date(userState.lastMessageAt).getTime() : 0;
  if (now - last < config.cooldownSeconds * 1000) return;

  const xpGain =
    config.xpMin === config.xpMax
      ? config.xpMin
      : Math.floor(
          Math.random() * (config.xpMax - config.xpMin + 1) + config.xpMin
        );

  const newXp = userState.xp + xpGain;
  const newLevel = getLevelFromXp(newXp);

  client.levelsStore.updateUser(message.guild.id, message.author.id, {
    xp: newXp,
    level: newLevel,
    lastMessageAt: new Date(now).toISOString(),
  });

  if (newLevel > userState.level) {
    const channelId = config.levelUpChannelId ?? message.channelId;
    const channel = message.guild.channels.cache.get(channelId);

    if (channel && channel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(0x00d2d3)
        .setTitle("Level Up!")
        .setDescription(
          `Great job ${message.author}! You reached **Level ${newLevel}**.`
        )
        .setFooter({ text: `XP: ${newXp} • Next: ${getNextLevelXp(newLevel)}` });

      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  }
};
