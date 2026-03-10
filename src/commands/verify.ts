import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";
import {
  buildVerificationPanelComponents,
  buildVerificationPanelEmbed,
} from "../utils/verificationSystem.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verification system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Configure verification")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Enable verification")
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Verification channel")
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role to grant on verify")
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("Panel title")
        )
        .addStringOption((option) =>
          option.setName("description").setDescription("Panel description")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("panel")
        .setDescription("Send the verification panel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Target channel")
            .addChannelTypes(ChannelType.GuildText)
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
        content: "You need Manage Server permissions to configure verification.",
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "config") {
      const config = client.verificationStore.updateConfig(interaction.guild.id, {
        enabled: interaction.options.getBoolean("enabled") ?? undefined,
        channelId: interaction.options.getChannel("channel")?.id ?? undefined,
        roleId: interaction.options.getRole("role")?.id ?? undefined,
        promptTitle: interaction.options.getString("title") ?? undefined,
        promptDescription: interaction.options.getString("description") ?? undefined,
      });

      const embed = new EmbedBuilder()
        .setColor(0x4b7bec)
        .setTitle("Verification Config Updated")
        .setDescription(
          `Enabled: **${config.enabled ? "Yes" : "No"}** • Role: ${
            config.roleId ? `<@&${config.roleId}>` : "Not set"
          }`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "panel") {
      const config = client.verificationStore.getConfig(interaction.guild.id);
      const target =
        interaction.options.getChannel("channel") ??
        (config.channelId
          ? interaction.guild.channels.cache.get(config.channelId)
          : interaction.channel);

      if (!target || target.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "Target must be a text channel.",
          ephemeral: true,
        });
        return;
      }

      const textChannel = target as TextChannel;
      await textChannel.send({
        embeds: [buildVerificationPanelEmbed(config.promptTitle, config.promptDescription)],
        components: buildVerificationPanelComponents(),
      });

      await interaction.reply({
        content: `Verification panel sent in <#${target.id}>.`,
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
