import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configure autoroles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to autorole")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from autorole")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List autoroles")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enable or disable autorole")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Enable autorole")
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

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
      await interaction.reply({
        content: "You need Manage Roles permission to configure autorole.",
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const role = interaction.options.getRole("role", true);
      const config = client.autoRoleStore.addRole(interaction.guild.id, role.id);
      await interaction.reply({
        content: `Role added. Total autoroles: ${config.roleIds.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "remove") {
      const role = interaction.options.getRole("role", true);
      const config = client.autoRoleStore.removeRole(interaction.guild.id, role.id);
      await interaction.reply({
        content: `Role removed. Total autoroles: ${config.roleIds.length}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "list") {
      const config = client.autoRoleStore.getConfig(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0x54a0ff)
        .setTitle("Autorole List")
        .setDescription(
          config.roleIds.length
            ? config.roleIds.map((id) => `<@&${id}>`).join(", ")
            : "No roles configured."
        )
        .addFields({
          name: "Enabled",
          value: config.enabled ? "Yes" : "No",
        });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "toggle") {
      const enabled = interaction.options.getBoolean("enabled", true);
      const config = client.autoRoleStore.updateConfig(interaction.guild.id, {
        enabled,
      });
      await interaction.reply({
        content: `Autorole is now ${config.enabled ? "enabled" : "disabled"}.`,
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
