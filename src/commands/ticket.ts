import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";
import {
  addParticipantToTicket,
  buildTicketOverviewEmbed,
  buildTicketPanelComponents,
  buildTicketPanelEmbed,
  claimTicket,
  closeTicket,
  getTicketTextChannel,
  hasTicketSetupAccess,
  isTicketStaff,
  removeParticipantFromTicket,
  renameTicket,
} from "../utils/ticketSystem.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Advanced ticket system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("panel")
        .setDescription("Publish the ticket panel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Where the panel should be sent")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Configure category, staff role and logs")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("Category used for new ticket channels")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addRoleOption((option) =>
          option
            .setName("staff_role")
            .setDescription("Role that can manage tickets")
            .setRequired(false)
        )
        .addChannelOption((option) =>
          option
            .setName("log_channel")
            .setDescription("Channel where ticket events are logged")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("max_open")
            .setDescription("Maximum number of open tickets per user")
            .setMinValue(1)
            .setMaxValue(5)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("Show ticket configuration and statistics")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("claim")
        .setDescription("Claim the current ticket")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a user to the current ticket")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a user from the current ticket")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rename")
        .setDescription("Rename the current ticket")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New ticket name")
            .setRequired(true)
            .setMaxLength(60)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close the current ticket")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for closing the ticket")
            .setRequired(false)
            .setMaxLength(1000)
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

    const client = interaction.client as ExtendedClient;
    const guild = interaction.guild;
    const subcommand = interaction.options.getSubcommand();
    const currentConfig = client.ticketStore.getConfig(guild.id);

    if (subcommand === "panel" || subcommand === "config") {
      if (!hasTicketSetupAccess(interaction.memberPermissions)) {
        await interaction.reply({
          content: "You need Manage Server permissions to configure the ticket system.",
          ephemeral: true,
        });
        return;
      }
    }

    if (subcommand === "panel") {
      const target = getTicketTextChannel(
        interaction.options.getChannel("channel") ?? interaction.channel
      );

      if (!target) {
        await interaction.reply({
          content: "The target must be a text channel.",
          ephemeral: true,
        });
        return;
      }

      await target.send({
        embeds: [buildTicketPanelEmbed(guild.name, currentConfig)],
        components: buildTicketPanelComponents(),
      });

      client.ticketStore.updateConfig(guild.id, {
        panelChannelId: target.id,
      });

      await interaction.reply({
        content: `Ticket panel published in <#${target.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "config") {
      const category = interaction.options.getChannel("category");
      const staffRole = interaction.options.getRole("staff_role");
      const logChannel = interaction.options.getChannel("log_channel");
      const maxOpen = interaction.options.getInteger("max_open");
      const hasChanges =
        category !== null ||
        staffRole !== null ||
        logChannel !== null ||
        maxOpen !== null;

      const config = hasChanges
        ? client.ticketStore.updateConfig(guild.id, {
            categoryId: category?.id,
            staffRoleId: staffRole?.id,
            logChannelId: logChannel?.id,
            maxOpenTicketsPerUser: maxOpen ?? undefined,
          })
        : currentConfig;

      await interaction.reply({
        embeds: [
          buildTicketOverviewEmbed(
            guild.name,
            config,
            client.ticketStore.getStats(guild.id)
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const member = await guild.members.fetch(interaction.user.id);
    const channel = getTicketTextChannel(interaction.channel);

    if (subcommand === "stats") {
      if (
        !hasTicketSetupAccess(interaction.memberPermissions) &&
        !isTicketStaff(member, currentConfig)
      ) {
        await interaction.reply({
          content: "Only ticket staff or server managers can view ticket stats.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          buildTicketOverviewEmbed(
            guild.name,
            currentConfig,
            client.ticketStore.getStats(guild.id)
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (!channel) {
      await interaction.reply({
        content: "This subcommand must be used inside a text ticket channel.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "claim") {
      const result = await claimTicket({
        client,
        guild,
        channel,
        member,
      });

      await interaction.reply({
        content: result.message,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "add") {
      const result = await addParticipantToTicket({
        client,
        guild,
        channel,
        member,
        user: interaction.options.getUser("user", true),
      });

      await interaction.reply({
        content: result.message,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "remove") {
      const result = await removeParticipantFromTicket({
        client,
        guild,
        channel,
        member,
        user: interaction.options.getUser("user", true),
      });

      await interaction.reply({
        content: result.message,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "rename") {
      const result = await renameTicket({
        client,
        guild,
        channel,
        member,
        newName: interaction.options.getString("name", true),
      });

      await interaction.reply({
        content: result.message,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "close") {
      await interaction.deferReply({ ephemeral: true });

      const result = await closeTicket({
        client,
        guild,
        channel,
        member,
        reason:
          interaction.options.getString("reason") ?? "No reason provided.",
      });

      await interaction.editReply({
        content: result.message,
      });
    }
  },
};

module.exports = command;
