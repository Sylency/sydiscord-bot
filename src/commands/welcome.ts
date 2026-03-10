import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";
import { buildWelcomePayload } from "../utils/welcomeSystem.js";
import { showWelcomeModal } from "../utils/welcomeModal.js";

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
        .addStringOption((option) =>
          option.setName("image_url").setDescription("Embed image URL")
        )
        .addStringOption((option) =>
          option.setName("thumbnail_url").setDescription("Embed thumbnail URL")
        )
        .addStringOption((option) =>
          option.setName("footer_text").setDescription("Footer text")
        )
        .addStringOption((option) =>
          option.setName("footer_icon").setDescription("Footer icon URL")
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
      subcommand
        .setName("field_add")
        .setDescription("Add an embed field")
        .addStringOption((option) =>
          option.setName("name").setDescription("Field title").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("value").setDescription("Field value").setRequired(true)
        )
        .addBooleanOption((option) =>
          option.setName("inline").setDescription("Inline field")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("field_remove")
        .setDescription("Remove an embed field by index")
        .addIntegerOption((option) =>
          option
            .setName("index")
            .setDescription("Field index (1-based)")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("field_clear").setDescription("Clear all fields")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("button_add")
        .setDescription("Add a link button")
        .addStringOption((option) =>
          option
            .setName("label")
            .setDescription("Button label")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("Button URL")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("button_remove")
        .setDescription("Remove a button by index")
        .addIntegerOption((option) =>
          option
            .setName("index")
            .setDescription("Button index (1-based)")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("button_clear").setDescription("Clear all buttons")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("test").setDescription("Send a test welcome message")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Open a modal to edit the welcome embed")
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
        embedImageUrl: interaction.options.getString("image_url") ?? undefined,
        embedThumbnailUrl:
          interaction.options.getString("thumbnail_url") ?? undefined,
        footerText: interaction.options.getString("footer_text") ?? undefined,
        footerIconUrl: interaction.options.getString("footer_icon") ?? undefined,
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

    if (subcommand === "field_add") {
      const name = interaction.options.getString("name", true);
      const value = interaction.options.getString("value", true);
      const inline = interaction.options.getBoolean("inline") ?? false;
      const current = client.welcomeStore.getConfig(interaction.guild.id);
      const fields = [...current.fields, { name, value, inline }];
      client.welcomeStore.updateConfig(interaction.guild.id, { fields });
      await interaction.reply({
        content: `Field added. Total fields: ${fields.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "field_remove") {
      const index = interaction.options.getInteger("index", true) - 1;
      const current = client.welcomeStore.getConfig(interaction.guild.id);
      if (index < 0 || index >= current.fields.length) {
        await interaction.reply({
          content: "Invalid field index.",
          ephemeral: true,
        });
        return;
      }
      const fields = current.fields.filter((_, i) => i !== index);
      client.welcomeStore.updateConfig(interaction.guild.id, { fields });
      await interaction.reply({
        content: `Field removed. Total fields: ${fields.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "field_clear") {
      client.welcomeStore.updateConfig(interaction.guild.id, { fields: [] });
      await interaction.reply({
        content: "All fields cleared.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "button_add") {
      const label = interaction.options.getString("label", true);
      const url = interaction.options.getString("url", true);
      const current = client.welcomeStore.getConfig(interaction.guild.id);
      const buttons = [...current.buttons, { label, url }];
      client.welcomeStore.updateConfig(interaction.guild.id, { buttons });
      await interaction.reply({
        content: `Button added. Total buttons: ${buttons.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "button_remove") {
      const index = interaction.options.getInteger("index", true) - 1;
      const current = client.welcomeStore.getConfig(interaction.guild.id);
      if (index < 0 || index >= current.buttons.length) {
        await interaction.reply({
          content: "Invalid button index.",
          ephemeral: true,
        });
        return;
      }
      const buttons = current.buttons.filter((_, i) => i !== index);
      client.welcomeStore.updateConfig(interaction.guild.id, { buttons });
      await interaction.reply({
        content: `Button removed. Total buttons: ${buttons.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "button_clear") {
      client.welcomeStore.updateConfig(interaction.guild.id, { buttons: [] });
      await interaction.reply({
        content: "All buttons cleared.",
        ephemeral: true,
      });
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

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const payload = buildWelcomePayload(member);
      await channel.send(payload);

      await interaction.reply({
        content: "Test welcome message sent.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "edit") {
      await showWelcomeModal(interaction);
    }
  },
};

module.exports = command;
