import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../types/index.js";

const spamTracker = new Map<string, Map<string, number[]>>();

const getUserSpamBucket = (guildId: string, userId: string): number[] => {
  const guildBucket = spamTracker.get(guildId) ?? new Map<string, number[]>();
  spamTracker.set(guildId, guildBucket);
  const bucket = guildBucket.get(userId) ?? [];
  guildBucket.set(userId, bucket);
  return bucket;
};

const countCapsRatio = (content: string): number => {
  const letters = content.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return 0;
  const caps = letters.replace(/[^A-Z]/g, "").length;
  return (caps / letters.length) * 100;
};

const hasInvite = (content: string): boolean =>
  /(discord\.gg\/|discord\.com\/invite\/)/i.test(content);

const hasLink = (content: string): boolean =>
  /(https?:\/\/|www\.)/i.test(content);

const hasBadWord = (content: string, badWords: string[]): string | null => {
  const lower = content.toLowerCase();
  for (const word of badWords) {
    if (word && lower.includes(word)) return word;
  }
  return null;
};

const isExempt = (member: GuildMember | null, channelId: string, exemptRoles: string[], exemptChannels: string[]): boolean => {
  if (exemptChannels.includes(channelId)) return true;
  if (!member) return false;
  return member.roles.cache.some((role) => exemptRoles.includes(role.id));
};

const sendAutomodLog = async (
  message: Message,
  reason: string,
  action: string
): Promise<void> => {
  const client = message.client as ExtendedClient;
  const config = client.automodStore.getConfig(message.guild!.id);
  if (!config.logChannelId) return;

  const channel = message.guild?.channels.cache.get(config.logChannelId);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const embed = new EmbedBuilder()
    .setColor(0xff6b6b)
    .setTitle("AutoMod Triggered")
    .addFields(
      { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: false },
      { name: "Channel", value: `<#${message.channelId}>`, inline: true },
      { name: "Reason", value: reason, inline: true },
      { name: "Action", value: action, inline: true }
    )
    .setTimestamp();

  await (channel as TextChannel).send({ embeds: [embed] });
};

export const handleAutomodMessage = async (message: Message): Promise<boolean> => {
  if (!message.guild || message.author.bot) return false;

  const client = message.client as ExtendedClient;
  const config = client.automodStore.getConfig(message.guild.id);
  if (!config.enabled) return false;

  if (isExempt(message.member, message.channelId, config.exemptRoles, config.exemptChannels)) {
    return false;
  }

  let reason: string | null = null;

  if (config.antiInvites && hasInvite(message.content)) {
    reason = "Discord invite detected";
  } else if (config.antiLinks && hasLink(message.content)) {
    reason = "External link detected";
  } else if (config.antiCaps && message.content.length >= config.capsMinLength) {
    const capsRatio = countCapsRatio(message.content);
    if (capsRatio >= config.capsPercent) {
      reason = `Excessive caps (${capsRatio.toFixed(0)}%)`;
    }
  } else if (config.antiMention) {
    const mentionCount =
      message.mentions.users.size +
      message.mentions.roles.size +
      (message.mentions.everyone ? 1 : 0);
    if (mentionCount >= config.mentionLimit) {
      reason = `Mass mention (${mentionCount} mentions)`;
    }
  }

  if (!reason && config.badWords.length > 0) {
    const badWord = hasBadWord(message.content, config.badWords);
    if (badWord) reason = `Bad word detected (${badWord})`;
  }

  if (!reason && config.antiSpam) {
    const bucket = getUserSpamBucket(message.guild.id, message.author.id);
    const now = Date.now();
    const windowMs = config.spamSeconds * 1000;
    bucket.push(now);
    while (bucket.length && bucket[0] < now - windowMs) {
      bucket.shift();
    }
    if (bucket.length >= config.spamMessages) {
      reason = `Spam detected (${bucket.length} messages / ${config.spamSeconds}s)`;
    }
  }

  if (!reason) return false;

  const botMember = message.guild.members.me;
  const canManageMessages = botMember?.permissions.has(
    PermissionsBitField.Flags.ManageMessages
  );
  const canTimeout = botMember?.permissions.has(
    PermissionsBitField.Flags.ModerateMembers
  );

  if (canManageMessages) {
    await message.delete().catch(() => null);
  }

  let action = "Deleted message";
  if (config.action === "timeout" && canTimeout && message.member) {
    await message.member.timeout(
      config.timeoutSeconds * 1000,
      "AutoMod violation"
    ).catch(() => null);
    action = `Timeout ${config.timeoutSeconds}s`;
  }

  await sendAutomodLog(message, reason, action);

  await message.author
    .send(
      `Your message in **${message.guild.name}** was removed: ${reason}.`
    )
    .catch(() => null);

  return true;
};
