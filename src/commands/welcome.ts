import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Update welcome settings")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Enable welcome")
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Welcome channel")
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((option) =>
          option.setName("message").setDescription("Message content")
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("Embed title")
        )
        .addStringOption((option) =>
          option.setName("description").setDescription("Embed description")
        )
        .addBooleanOption((option) =>
          option.setName("mention").setDescription("Mention the user")
        )
        .addBooleanOption((option) =>
          option.setName("avatar").setDescription("Show avatar thumbnail")
        )
        .addIntegerOption((option) =>
          option
            .setName("color")
            .setDescription("Embed color (hex without #, e.g. FFCC00)")
            .setMinValue(0)
            .setMaxValue(0xffffff)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("test").setDescription("Send a test welcome message")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.reply({
        content: "You need Manage Server permissions to configure welcome.",
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "config") {
      const config = client.welcomeStore.updateConfig(interaction.guild.id, {
        enabled: interaction.options.getBoolean("enabled") ?? undefined,
        channelId: interaction.options.getChannel("channel")?.id ?? undefined,
        message: interaction.options.getString("message") ?? undefined,
        embedTitle: interaction.options.getString("title") ?? undefined,
        embedDescription: interaction.options.getString("description") ?? undefined,
        mentionUser: interaction.options.getBoolean("mention") ?? undefined,
        includeAvatar: interaction.options.getBoolean("avatar") ?? undefined,
        color: interaction.options.getInteger("color") ?? undefined,
      });

      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle("Welcome Config Updated")
        .setDescription(
          `Enabled: **${config.enabled ? "Yes" : "No"}** • Channel: ${
            config.channelId ? `<#${config.channelId}>` : "Not set"
          }`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "test") {
      const config = client.welcomeStore.getConfig(interaction.guild.id);
      if (!config.channelId) {
        await interaction.reply({
          content: "Set a welcome channel first.",
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: "Welcome channel not found.",
          ephemeral: true,
        });
        return;
      }

      await channel.send({
        content: config.mentionUser ? `<@${interaction.user.id}>` : undefined,
        embeds: [
          new EmbedBuilder()
            .setColor(config.color)
            .setTitle(config.embedTitle)
            .setDescription(config.embedDescription),
        ],
      });

      await interaction.reply({
        content: "Test welcome message sent.",
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
