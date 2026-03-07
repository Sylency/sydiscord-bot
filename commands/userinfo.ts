import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("👤 Show info about a user")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user to look up (defaults to yourself)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target =
      (interaction.options.getMember("user") as GuildMember | null) ??
      (interaction.member as GuildMember);

    const user = target.user;
    const roles = target.roles.cache
      .filter((r) => r.id !== interaction.guildId)
      .map((r) => `<@&${r.id}>`)
      .join(", ") || "None";

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor || 0x5865f2)
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "🆔 User ID", value: `\`${user.id}\``, inline: true },
        { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true },
        {
          name: "📅 Account Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: false,
        },
        {
          name: "📥 Joined Server",
          value: target.joinedTimestamp
            ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`
            : "Unknown",
          inline: true,
        },
        { name: "🎭 Roles", value: roles, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

module.exports = command;
