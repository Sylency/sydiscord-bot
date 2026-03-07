import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("📊 Show information about this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild as Guild;

    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(
      (m) => m.presence?.status !== "offline" && m.presence !== null
    ).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
        {
          name: "📅 Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "👥 Members",
          value: `**${totalMembers}** total / **${onlineMembers}** online`,
          inline: false,
        },
        {
          name: "💬 Channels",
          value: `${guild.channels.cache.size} channels`,
          inline: true,
        },
        {
          name: "🎭 Roles",
          value: `${guild.roles.cache.size} roles`,
          inline: true,
        },
        {
          name: "🌍 Region",
          value: guild.preferredLocale ?? "Unknown",
          inline: true,
        }
      )
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

module.exports = command;
