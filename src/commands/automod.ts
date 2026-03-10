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
    .setName("automod")
    .setDescription("Configure the automod system")
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Show current settings")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enable or disable automod")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Enable automod")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Update automod settings")
        .addBooleanOption((option) =>
          option.setName("anti_links").setDescription("Block links")
        )
        .addBooleanOption((option) =>
          option.setName("anti_invites").setDescription("Block discord invites")
        )
        .addBooleanOption((option) =>
          option.setName("anti_caps").setDescription("Block excessive caps")
        )
        .addIntegerOption((option) =>
          option
            .setName("caps_percent")
            .setDescription("Caps percent threshold")
            .setMinValue(50)
            .setMaxValue(100)
        )
        .addIntegerOption((option) =>
          option
            .setName("caps_min")
            .setDescription("Minimum length before caps check")
            .setMinValue(5)
            .setMaxValue(100)
        )
        .addBooleanOption((option) =>
          option.setName("anti_spam").setDescription("Enable anti spam")
        )
        .addIntegerOption((option) =>
          option
            .setName("spam_messages")
            .setDescription("Messages allowed in window")
            .setMinValue(3)
            .setMaxValue(10)
        )
        .addIntegerOption((option) =>
          option
            .setName("spam_seconds")
            .setDescription("Window size in seconds")
            .setMinValue(3)
            .setMaxValue(30)
        )
        .addBooleanOption((option) =>
          option.setName("anti_mention").setDescription("Block mass mentions")
        )
        .addIntegerOption((option) =>
          option
            .setName("mention_limit")
            .setDescription("Mention limit")
            .setMinValue(3)
            .setMaxValue(15)
        )
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to take")
            .addChoices(
              { name: "Delete", value: "delete" },
              { name: "Timeout", value: "timeout" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("timeout_seconds")
            .setDescription("Timeout length in seconds")
            .setMinValue(30)
            .setMaxValue(3600)
        )
        .addChannelOption((option) =>
          option
            .setName("log_channel")
            .setDescription("Log channel for automod")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badword_add")
        .setDescription("Add a bad word")
        .addStringOption((option) =>
          option
            .setName("word")
            .setDescription("Word to block")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badword_remove")
        .setDescription("Remove a bad word")
        .addStringOption((option) =>
          option
            .setName("word")
            .setDescription("Word to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("exempt_role_add")
        .setDescription("Add an exempt role")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to exempt")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("exempt_role_remove")
        .setDescription("Remove an exempt role")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("exempt_channel_add")
        .setDescription("Add an exempt channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to exempt")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("exempt_channel_remove")
        .setDescription("Remove an exempt channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to remove")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
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
        content: "You need Manage Server permissions to configure automod.",
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "status") {
      const config = client.automodStore.getConfig(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x2d98da)
        .setTitle("AutoMod Settings")
        .addFields(
          { name: "Enabled", value: config.enabled ? "Yes" : "No", inline: true },
          { name: "Action", value: config.action, inline: true },
          { name: "Timeout", value: `${config.timeoutSeconds}s`, inline: true },
          { name: "Anti Links", value: config.antiLinks ? "On" : "Off", inline: true },
          { name: "Anti Invites", value: config.antiInvites ? "On" : "Off", inline: true },
          { name: "Anti Caps", value: config.antiCaps ? "On" : "Off", inline: true },
          {
            name: "Caps Threshold",
            value: `${config.capsPercent}% / ${config.capsMinLength} chars`,
            inline: true,
          },
          { name: "Anti Spam", value: config.antiSpam ? "On" : "Off", inline: true },
          {
            name: "Spam Window",
            value: `${config.spamMessages} msgs / ${config.spamSeconds}s`,
            inline: true,
          },
          {
            name: "Anti Mention",
            value: config.antiMention ? "On" : "Off",
            inline: true,
          },
          { name: "Mention Limit", value: `${config.mentionLimit}`, inline: true },
          {
            name: "Bad Words",
            value: config.badWords.length ? config.badWords.join(", ") : "None",
            inline: false,
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "toggle") {
      const enabled = interaction.options.getBoolean("enabled", true);
      client.automodStore.updateConfig(guildId, { enabled });
      await interaction.reply({
        content: `AutoMod is now ${enabled ? "enabled" : "disabled"}.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "set") {
      const patch = {
        antiLinks: interaction.options.getBoolean("anti_links") ?? undefined,
        antiInvites: interaction.options.getBoolean("anti_invites") ?? undefined,
        antiCaps: interaction.options.getBoolean("anti_caps") ?? undefined,
        capsPercent: interaction.options.getInteger("caps_percent") ?? undefined,
        capsMinLength: interaction.options.getInteger("caps_min") ?? undefined,
        antiSpam: interaction.options.getBoolean("anti_spam") ?? undefined,
        spamMessages: interaction.options.getInteger("spam_messages") ?? undefined,
        spamSeconds: interaction.options.getInteger("spam_seconds") ?? undefined,
        antiMention: interaction.options.getBoolean("anti_mention") ?? undefined,
        mentionLimit: interaction.options.getInteger("mention_limit") ?? undefined,
        action: interaction.options.getString("action") as "delete" | "timeout" | null,
        timeoutSeconds:
          interaction.options.getInteger("timeout_seconds") ?? undefined,
        logChannelId: interaction.options.getChannel("log_channel")?.id ?? undefined,
      };

      const config = client.automodStore.updateConfig(guildId, {
        ...patch,
        action: patch.action ?? undefined,
      });

      await interaction.reply({
        content: "AutoMod settings updated.",
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d98da)
            .setTitle("Updated Settings")
            .setDescription(
              `Enabled: **${config.enabled ? "Yes" : "No"}** • Action: **${config.action}**`
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "badword_add") {
      const word = interaction.options.getString("word", true);
      const config = client.automodStore.addBadWord(guildId, word);
      await interaction.reply({
        content: `Added bad word. Total: ${config.badWords.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "badword_remove") {
      const word = interaction.options.getString("word", true);
      const config = client.automodStore.removeBadWord(guildId, word);
      await interaction.reply({
        content: `Removed bad word. Total: ${config.badWords.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "exempt_role_add") {
      const role = interaction.options.getRole("role", true);
      const config = client.automodStore.updateConfig(guildId, {
        exemptRoles: Array.from(new Set([...client.automodStore.getConfig(guildId).exemptRoles, role.id])),
      });
      await interaction.reply({
        content: `Added exempt role. Total: ${config.exemptRoles.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "exempt_role_remove") {
      const role = interaction.options.getRole("role", true);
      const current = client.automodStore.getConfig(guildId);
      const config = client.automodStore.updateConfig(guildId, {
        exemptRoles: current.exemptRoles.filter((id) => id !== role.id),
      });
      await interaction.reply({
        content: `Removed exempt role. Total: ${config.exemptRoles.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "exempt_channel_add") {
      const channel = interaction.options.getChannel("channel", true);
      const current = client.automodStore.getConfig(guildId);
      const config = client.automodStore.updateConfig(guildId, {
        exemptChannels: Array.from(new Set([...current.exemptChannels, channel.id])),
      });
      await interaction.reply({
        content: `Added exempt channel. Total: ${config.exemptChannels.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "exempt_channel_remove") {
      const channel = interaction.options.getChannel("channel", true);
      const current = client.automodStore.getConfig(guildId);
      const config = client.automodStore.updateConfig(guildId, {
        exemptChannels: current.exemptChannels.filter((id) => id !== channel.id),
      });
      await interaction.reply({
        content: `Removed exempt channel. Total: ${config.exemptChannels.length}`,
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
