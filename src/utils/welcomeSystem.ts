import { EmbedBuilder, GuildMember } from "discord.js";
import { ExtendedClient } from "../types/index.js";

const applyPlaceholders = (
  template: string,
  member: GuildMember
): string => {
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{userTag}", member.user.tag)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{memberCount}", member.guild.memberCount.toString());
};

export const handleWelcomeMember = async (
  member: GuildMember
): Promise<void> => {
  const client = member.client as ExtendedClient;
  const config = client.welcomeStore.getConfig(member.guild.id);
  if (!config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(applyPlaceholders(config.embedTitle, member))
    .setDescription(applyPlaceholders(config.embedDescription, member))
    .setTimestamp();

  if (config.includeAvatar) {
    embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
  }

  const content = config.mentionUser
    ? applyPlaceholders(config.message, member)
    : applyPlaceholders(config.message, member).replace(`<@${member.id}>`, member.user.tag);

  await channel.send({
    content,
    embeds: [embed],
  });
};
