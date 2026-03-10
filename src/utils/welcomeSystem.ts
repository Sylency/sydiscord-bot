import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
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

export const buildWelcomePayload = (member: GuildMember) => {
  const client = member.client as ExtendedClient;
  const config = client.welcomeStore.getConfig(member.guild.id);

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(applyPlaceholders(config.embedTitle, member))
    .setDescription(applyPlaceholders(config.embedDescription, member))
    .setTimestamp();

  if (config.embedImageUrl) {
    embed.setImage(config.embedImageUrl);
  }

  if (config.embedThumbnailUrl) {
    embed.setThumbnail(config.embedThumbnailUrl);
  } else if (config.includeAvatar) {
    embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
  }

  if (config.footerText) {
    embed.setFooter({
      text: applyPlaceholders(config.footerText, member),
      iconURL: config.footerIconUrl ?? undefined,
    });
  }

  if (config.fields.length) {
    embed.addFields(
      config.fields.slice(0, 25).map((field) => ({
        name: applyPlaceholders(field.name, member),
        value: applyPlaceholders(field.value, member),
        inline: field.inline ?? false,
      }))
    );
  }

  const content = config.mentionUser
    ? applyPlaceholders(config.message, member)
    : applyPlaceholders(config.message, member).replace(
        `<@${member.id}>`,
        member.user.tag
      );

  const components =
    config.buttons.length > 0
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            config.buttons.slice(0, 5).map((button) =>
              new ButtonBuilder()
                .setLabel(button.label)
                .setStyle(ButtonStyle.Link)
                .setURL(button.url)
            )
          ),
        ]
      : [];

  return { content, embeds: [embed], components };
};

export const handleWelcomeMember = async (
  member: GuildMember
): Promise<void> => {
  const client = member.client as ExtendedClient;
  const config = client.welcomeStore.getConfig(member.guild.id);
  if (!config.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  if (!channel || !channel.isTextBased()) return;

  const payload = buildWelcomePayload(member);
  await channel.send(payload);
};
