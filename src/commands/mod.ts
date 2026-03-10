import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  TextChannel,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderation commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ban")
        .setDescription("Ban a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to ban").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kick")
        .setDescription("Kick a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to kick").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("timeout")
        .setDescription("Timeout a user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to timeout")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("minutes")
            .setDescription("Timeout length in minutes")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("untimeout")
        .setDescription("Remove timeout from a user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to untimeout")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("warn")
        .setDescription("Warn a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to warn").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unwarn")
        .setDescription("Remove a warning by ID")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("warning_id")
            .setDescription("Warning ID")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("warnings")
        .setDescription("List warnings for a user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("purge")
        .setDescription("Delete multiple messages")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Number of messages to delete")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("slowmode")
        .setDescription("Set slowmode for the current channel")
        .addIntegerOption((option) =>
          option
            .setName("seconds")
            .setDescription("Slowmode seconds (0 to disable)")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("nick")
        .setDescription("Change a user's nickname")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("nickname")
            .setDescription("New nickname")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("lock").setDescription("Lock the current channel")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("unlock").setDescription("Unlock the current channel")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const client = interaction.client as ExtendedClient;

    if (["ban", "kick"].includes(subcommand)) {
      const hasPerm = interaction.memberPermissions?.has(
        subcommand === "ban"
          ? PermissionsBitField.Flags.BanMembers
          : PermissionsBitField.Flags.KickMembers
      );
      if (!hasPerm) {
        await interaction.reply({
          content: `You need ${subcommand === "ban" ? "Ban" : "Kick"} Members permission.`,
          ephemeral: true,
        });
        return;
      }
    }

    if (["timeout", "untimeout"].includes(subcommand)) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) {
        await interaction.reply({
          content: "You need Moderate Members permission.",
          ephemeral: true,
        });
        return;
      }
    }

    if (["warn", "unwarn", "warnings", "purge", "slowmode", "nick", "lock", "unlock"].includes(subcommand)) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        await interaction.reply({
          content: "You need Manage Messages permission.",
          ephemeral: true,
        });
        return;
      }
    }

    if (subcommand === "ban") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided.";
      await interaction.guild.members.ban(user.id, { reason }).catch(() => null);
      await interaction.reply({ content: `Banned ${user.tag}.`, ephemeral: true });
      return;
    }

    if (subcommand === "kick") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided.";
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "Member not found.", ephemeral: true });
        return;
      }
      await member.kick(reason).catch(() => null);
      await interaction.reply({ content: `Kicked ${user.tag}.`, ephemeral: true });
      return;
    }

    if (subcommand === "timeout") {
      const user = interaction.options.getUser("user", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided.";
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "Member not found.", ephemeral: true });
        return;
      }
      await member.timeout(minutes * 60 * 1000, reason).catch(() => null);
      await interaction.reply({
        content: `Timed out ${user.tag} for ${minutes} minutes.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "untimeout") {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "Member not found.", ephemeral: true });
        return;
      }
      await member.timeout(null).catch(() => null);
      await interaction.reply({
        content: `Removed timeout for ${user.tag}.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "warn") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const warning = client.moderationStore.addWarning(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        reason
      );
      await interaction.reply({
        content: `Warned ${user.tag} (ID ${warning.id}).`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "unwarn") {
      const user = interaction.options.getUser("user", true);
      const warningId = interaction.options.getInteger("warning_id", true);
      const removed = client.moderationStore.removeWarning(
        interaction.guild.id,
        user.id,
        warningId
      );
      await interaction.reply({
        content: removed
          ? `Removed warning ${warningId} for ${user.tag}.`
          : "Warning not found.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "warnings") {
      const user = interaction.options.getUser("user", true);
      const warnings = client.moderationStore.getWarnings(
        interaction.guild.id,
        user.id
      );
      const embed = new EmbedBuilder()
        .setColor(0xff9f43)
        .setTitle(`Warnings for ${user.tag}`)
        .setDescription(
          warnings.length
            ? warnings
                .map(
                  (entry) =>
                    `**#${entry.id}** • ${entry.reason} • <@${entry.moderatorId}>`
                )
                .join("\n")
            : "No warnings."
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "purge") {
      const amount = interaction.options.getInteger("amount", true);
      if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "This command can only be used in text channels.",
          ephemeral: true,
        });
        return;
      }
      const channel = interaction.channel as TextChannel;
      const messages = await channel.bulkDelete(amount, true).catch(() => null);
      await interaction.reply({
        content: `Deleted ${messages?.size ?? 0} messages.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "slowmode") {
      const seconds = interaction.options.getInteger("seconds", true);
      if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "This command can only be used in text channels.",
          ephemeral: true,
        });
        return;
      }
      const channel = interaction.channel as TextChannel;
      await channel.setRateLimitPerUser(seconds).catch(() => null);
      await interaction.reply({
        content: `Slowmode set to ${seconds} seconds.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "nick") {
      const user = interaction.options.getUser("user", true);
      const nickname = interaction.options.getString("nickname", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "Member not found.", ephemeral: true });
        return;
      }
      await member.setNickname(nickname).catch(() => null);
      await interaction.reply({
        content: `Nickname updated for ${user.tag}.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "lock" || subcommand === "unlock") {
      if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "This command can only be used in text channels.",
          ephemeral: true,
        });
        return;
      }
      const channel = interaction.channel as TextChannel;
      const everyone = interaction.guild.roles.everyone;
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: subcommand === "unlock",
      });
      await interaction.reply({
        content: subcommand === "unlock" ? "Channel unlocked." : "Channel locked.",
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
