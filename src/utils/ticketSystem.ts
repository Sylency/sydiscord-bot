import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
  OverwriteResolvable,
  PermissionFlagsBits,
  PermissionsBitField,
  Role,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import { ExtendedClient } from "../types/index.js";
import { GuildTicketConfig, TicketRecord } from "./ticketStore.js";

const TICKET_COLOR = 0x5865f2;
const TICKET_SUCCESS_COLOR = 0x57f287;
const TICKET_WARNING_COLOR = 0xfee75c;
const TICKET_DANGER_COLOR = 0xed4245;

export const TICKET_CUSTOM_IDS = {
  createButton: "ticket:create",
  claimButton: "ticket:claim",
  renameButton: "ticket:rename",
  closeButton: "ticket:close",
  createModal: "ticket:create-modal",
  renameModal: "ticket:rename-modal",
  closeModal: "ticket:close-modal",
} as const;

const TICKET_FIELD_IDS = {
  subject: "subject",
  reason: "reason",
  priority: "priority",
  newName: "new-name",
  closeReason: "close-reason",
} as const;

interface TranscriptExport {
  buffer: Buffer;
  fileName: string;
}

interface TicketActionResult {
  success: boolean;
  message: string;
  ticket?: TicketRecord;
}

const mentionChannel = (channelId: string | null): string =>
  channelId ? `<#${channelId}>` : "`not set`";

const mentionRole = (roleId: string | null): string =>
  roleId ? `<@&${roleId}>` : "`not set`";

const toTitleCase = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const sanitiseSingleLine = (value: string, fallback: string): string => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || fallback;
};

const sanitiseParagraph = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalisePriority = (value: string): string => {
  const normalized = sanitiseSingleLine(value, "Medium").toLowerCase();

  if (["low", "bassa", "basso", "minor"].includes(normalized)) {
    return "Low";
  }

  if (["high", "alta", "alto", "important"].includes(normalized)) {
    return "High";
  }

  if (["urgent", "urgente", "critical", "critica"].includes(normalized)) {
    return "Urgent";
  }

  if (["medium", "media", "normale", "normal"].includes(normalized)) {
    return "Medium";
  }

  return toTitleCase(normalized);
};

const padTicketNumber = (ticketNumber: number): string =>
  ticketNumber.toString().padStart(4, "0");

const buildTicketLabel = (ticketNumber: number): string =>
  `#${padTicketNumber(ticketNumber)}`;

const slugify = (value: string): string => {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || "support";
};

const buildTicketChannelName = (ticketNumber: number, subject: string): string =>
  `ticket-${padTicketNumber(ticketNumber)}-${slugify(subject)}`.slice(0, 100);

const buildTicketTopic = (ticket: TicketRecord): string => {
  const segments = [
    `Ticket ${buildTicketLabel(ticket.ticketNumber)}`,
    `Owner ${ticket.ownerId}`,
    `Priority ${ticket.priority}`,
  ];

  if (ticket.claimedById) {
    segments.push(`Claimed ${ticket.claimedById}`);
  }

  return segments.join(" | ");
};

const buildTicketControls = (): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_CUSTOM_IDS.claimButton)
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(TICKET_CUSTOM_IDS.renameButton)
      .setLabel("Rename")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(TICKET_CUSTOM_IDS.closeButton)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  ),
];

export const buildTicketPanelComponents = (): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_CUSTOM_IDS.createButton)
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Success)
  ),
];

export const buildTicketPanelEmbed = (
  guildName: string,
  config: GuildTicketConfig
): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(TICKET_COLOR)
    .setTitle("Support Tickets")
    .setDescription(
      "Press the button below to open a support ticket. A private channel will be created for you."
    )
    .addFields(
      {
        name: "Open Limit",
        value: `\`${config.maxOpenTicketsPerUser}\` open ticket(s) per user`,
        inline: true,
      },
      {
        name: "Staff Role",
        value: mentionRole(config.staffRoleId),
        inline: true,
      },
      {
        name: "Logs",
        value: mentionChannel(config.logChannelId),
        inline: true,
      }
    )
    .setFooter({ text: guildName });

export const buildTicketOverviewEmbed = (
  guildName: string,
  config: GuildTicketConfig,
  stats: {
    openCount: number;
    totalOpened: number;
    totalClosed: number;
  }
): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(TICKET_COLOR)
    .setTitle("Ticket Overview")
    .setDescription(`Current ticket configuration for **${guildName}**.`)
    .addFields(
      {
        name: "Category",
        value: mentionChannel(config.categoryId),
        inline: true,
      },
      {
        name: "Staff Role",
        value: mentionRole(config.staffRoleId),
        inline: true,
      },
      {
        name: "Log Channel",
        value: mentionChannel(config.logChannelId),
        inline: true,
      },
      {
        name: "Panel Channel",
        value: mentionChannel(config.panelChannelId),
        inline: true,
      },
      {
        name: "Max Open Per User",
        value: `\`${config.maxOpenTicketsPerUser}\``,
        inline: true,
      },
      {
        name: "Open Now",
        value: `\`${stats.openCount}\``,
        inline: true,
      },
      {
        name: "Opened Total",
        value: `\`${stats.totalOpened}\``,
        inline: true,
      },
      {
        name: "Closed Total",
        value: `\`${stats.totalClosed}\``,
        inline: true,
      }
    )
    .setTimestamp();

const buildTicketOpenEmbed = (ticket: TicketRecord, opener: User): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(TICKET_COLOR)
    .setTitle(`Ticket ${buildTicketLabel(ticket.ticketNumber)}`)
    .setDescription("Use the buttons below to manage this ticket.")
    .addFields(
      {
        name: "Opened By",
        value: `<@${opener.id}>`,
        inline: true,
      },
      {
        name: "Priority",
        value: ticket.priority,
        inline: true,
      },
      {
        name: "Subject",
        value: ticket.subject,
        inline: false,
      },
      {
        name: "Details",
        value: ticket.reason.slice(0, 1024),
        inline: false,
      }
    )
    .setFooter({ text: `Created ${buildTicketLabel(ticket.ticketNumber)}` })
    .setTimestamp();

const buildInfoEmbed = (title: string, description: string, color: number): EmbedBuilder =>
  new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();

const isTextChannel = (channel: unknown): channel is TextChannel =>
  channel instanceof TextChannel || (typeof channel === "object" &&
    channel !== null &&
    "type" in channel &&
    (channel as TextChannel).type === ChannelType.GuildText);

const getStaffRole = (guild: Guild, config: GuildTicketConfig): Role | null => {
  if (!config.staffRoleId) {
    return null;
  }

  return guild.roles.cache.get(config.staffRoleId) ?? null;
};

const getCategoryId = (guild: Guild, config: GuildTicketConfig): string | null => {
  if (!config.categoryId) {
    return null;
  }

  const channel = guild.channels.cache.get(config.categoryId);
  return channel?.type === ChannelType.GuildCategory ? channel.id : null;
};

const getLogChannel = (guild: Guild, config: GuildTicketConfig): TextChannel | null => {
  if (!config.logChannelId) {
    return null;
  }

  const channel = guild.channels.cache.get(config.logChannelId);
  return isTextChannel(channel) ? channel : null;
};

const formatDuration = (from: string, to: string): string => {
  const durationMs = Math.max(0, new Date(to).getTime() - new Date(from).getTime());
  const totalMinutes = Math.floor(durationMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (minutes || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
};

const buildTranscriptExport = async (
  channel: TextChannel,
  ticket: TicketRecord
): Promise<TranscriptExport> => {
  const messages: Message[] = [];
  let before: string | undefined;

  while (messages.length < 1000) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (!fetched.size) {
      break;
    }

    const batch = [...fetched.values()];
    messages.push(...batch);
    before = batch[batch.length - 1]?.id;

    if (fetched.size < 100) {
      break;
    }
  }

  const transcriptLines = messages
    .reverse()
    .map((message) => {
      const parts = [];
      const content = message.content.trim();

      if (content) {
        parts.push(content);
      }

      if (message.attachments.size) {
        parts.push(
          `Attachments: ${message.attachments.map((attachment) => attachment.url).join(", ")}`
        );
      }

      if (message.embeds.length) {
        parts.push(`Embeds: ${message.embeds.length}`);
      }

      if (message.stickers.size) {
        parts.push(`Stickers: ${message.stickers.size}`);
      }

      if (!parts.length) {
        parts.push("[No text content]");
      }

      return `[${message.createdAt.toISOString()}] ${message.author.tag}: ${parts.join(" | ")}`;
    });

  const header = [
    `Ticket ${buildTicketLabel(ticket.ticketNumber)}`,
    `Owner: ${ticket.ownerId}`,
    `Subject: ${ticket.subject}`,
    `Priority: ${ticket.priority}`,
    `Created: ${ticket.createdAt}`,
    "",
  ];

  return {
    buffer: Buffer.from([...header, ...transcriptLines].join("\n"), "utf8"),
    fileName: `ticket-${padTicketNumber(ticket.ticketNumber)}-transcript.txt`,
  };
};

const sendLogMessage = async (
  guild: Guild,
  config: GuildTicketConfig,
  embed: EmbedBuilder,
  transcript?: TranscriptExport
): Promise<void> => {
  const logChannel = getLogChannel(guild, config);

  if (!logChannel) {
    return;
  }

  await logChannel.send({
    embeds: [embed],
    files: transcript
      ? [new AttachmentBuilder(transcript.buffer, { name: transcript.fileName })]
      : [],
  });
};

const notifyOwner = async (
  client: ExtendedClient,
  ticket: TicketRecord,
  reason: string,
  transcript?: TranscriptExport
): Promise<void> => {
  try {
    const owner = await client.users.fetch(ticket.ownerId);
    await owner.send({
      embeds: [
        buildInfoEmbed(
          `Ticket ${buildTicketLabel(ticket.ticketNumber)} closed`,
          `Reason: ${reason}`,
          TICKET_DANGER_COLOR
        ),
      ],
      files: transcript
        ? [new AttachmentBuilder(transcript.buffer, { name: transcript.fileName })]
        : [],
    });
  } catch {
    // DM delivery is best-effort only.
  }
};

export const hasTicketSetupAccess = (memberPermissions: Permissions): boolean =>
  Boolean(
    memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      memberPermissions?.has(PermissionFlagsBits.Administrator)
  );

type Permissions = PermissionsBitField | Readonly<PermissionsBitField> | null;

export const isTicketStaff = (
  member: GuildMember,
  config: GuildTicketConfig
): boolean => {
  if (
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  return config.staffRoleId ? member.roles.cache.has(config.staffRoleId) : false;
};

export const canManageTicket = (
  member: GuildMember,
  ticket: TicketRecord,
  config: GuildTicketConfig
): boolean => ticket.ownerId === member.id || isTicketStaff(member, config);

export const getOpenTicketFromChannel = (
  client: ExtendedClient,
  channelId: string
): TicketRecord | null => client.ticketStore.getOpenTicketByChannel(channelId);

export const getTicketTextChannel = (channel: unknown): TextChannel | null =>
  isTextChannel(channel) ? channel : null;

export const claimTicket = async (options: {
  client: ExtendedClient;
  guild: Guild;
  channel: TextChannel;
  member: GuildMember;
}): Promise<TicketActionResult> => {
  const { client, guild, channel, member } = options;
  const config = client.ticketStore.getConfig(guild.id);
  const current = client.ticketStore.getOpenTicketByChannel(channel.id);

  if (!current) {
    return {
      success: false,
      message: "This channel is not an open ticket.",
    };
  }

  if (!isTicketStaff(member, config)) {
    return {
      success: false,
      message: "Only ticket staff can claim tickets.",
    };
  }

  if (current.claimedById === member.id) {
    return {
      success: true,
      message: `Ticket ${buildTicketLabel(current.ticketNumber)} is already assigned to you.`,
      ticket: current,
    };
  }

  const previousAssignee = current.claimedById;
  const updated = client.ticketStore.claimTicket(channel.id, member.id);

  if (!updated) {
    return {
      success: false,
      message: "Unable to update the ticket assignment.",
    };
  }

  await channel.setTopic(buildTicketTopic(updated)).catch(() => undefined);

  const description = previousAssignee
    ? `Ticket reassigned from <@${previousAssignee}> to <@${member.id}>.`
    : `Ticket claimed by <@${member.id}>.`;

  const embed = buildInfoEmbed("Ticket Claimed", description, TICKET_SUCCESS_COLOR);

  await channel.send({ embeds: [embed] });
  await sendLogMessage(guild, config, embed);

  return {
    success: true,
    message: `Ticket ${buildTicketLabel(updated.ticketNumber)} assigned to <@${member.id}>.`,
    ticket: updated,
  };
};

export const renameTicket = async (options: {
  client: ExtendedClient;
  guild: Guild;
  channel: TextChannel;
  member: GuildMember;
  newName: string;
}): Promise<TicketActionResult> => {
  const { client, guild, channel, member, newName } = options;
  const config = client.ticketStore.getConfig(guild.id);
  const current = client.ticketStore.getOpenTicketByChannel(channel.id);

  if (!current) {
    return {
      success: false,
      message: "This channel is not an open ticket.",
    };
  }

  if (!canManageTicket(member, current, config)) {
    return {
      success: false,
      message: "Only the ticket owner or staff can rename this ticket.",
    };
  }

  const subject = sanitiseSingleLine(newName, current.subject);
  const updated = client.ticketStore.updateTicket(channel.id, { subject });

  if (!updated) {
    return {
      success: false,
      message: "Unable to rename the ticket.",
    };
  }

  await channel.setName(buildTicketChannelName(updated.ticketNumber, subject));
  await channel.setTopic(buildTicketTopic(updated)).catch(() => undefined);

  const embed = buildInfoEmbed(
    "Ticket Renamed",
    `Ticket ${buildTicketLabel(updated.ticketNumber)} renamed to **${subject}** by <@${member.id}>.`,
    TICKET_WARNING_COLOR
  );

  await channel.send({ embeds: [embed] });
  await sendLogMessage(guild, config, embed);

  return {
    success: true,
    message: `Ticket renamed to **${subject}**.`,
    ticket: updated,
  };
};

export const addParticipantToTicket = async (options: {
  client: ExtendedClient;
  guild: Guild;
  channel: TextChannel;
  member: GuildMember;
  user: User;
}): Promise<TicketActionResult> => {
  const { client, guild, channel, member, user } = options;
  const config = client.ticketStore.getConfig(guild.id);
  const current = client.ticketStore.getOpenTicketByChannel(channel.id);

  if (!current) {
    return {
      success: false,
      message: "This channel is not an open ticket.",
    };
  }

  if (!isTicketStaff(member, config)) {
    return {
      success: false,
      message: "Only ticket staff can add members to a ticket.",
    };
  }

  if (current.participants.includes(user.id)) {
    return {
      success: true,
      message: `<@${user.id}> is already part of this ticket.`,
      ticket: current,
    };
  }

  await channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  const updated = client.ticketStore.addParticipant(channel.id, user.id);

  if (!updated) {
    return {
      success: false,
      message: "Unable to update the ticket members.",
    };
  }

  const embed = buildInfoEmbed(
    "Participant Added",
    `<@${user.id}> was added to ticket ${buildTicketLabel(updated.ticketNumber)} by <@${member.id}>.`,
    TICKET_SUCCESS_COLOR
  );

  await channel.send({ embeds: [embed] });
  await sendLogMessage(guild, config, embed);

  return {
    success: true,
    message: `<@${user.id}> can now access ticket ${buildTicketLabel(updated.ticketNumber)}.`,
    ticket: updated,
  };
};

export const removeParticipantFromTicket = async (options: {
  client: ExtendedClient;
  guild: Guild;
  channel: TextChannel;
  member: GuildMember;
  user: User;
}): Promise<TicketActionResult> => {
  const { client, guild, channel, member, user } = options;
  const config = client.ticketStore.getConfig(guild.id);
  const current = client.ticketStore.getOpenTicketByChannel(channel.id);

  if (!current) {
    return {
      success: false,
      message: "This channel is not an open ticket.",
    };
  }

  if (!isTicketStaff(member, config)) {
    return {
      success: false,
      message: "Only ticket staff can remove members from a ticket.",
    };
  }

  if (current.ownerId === user.id) {
    return {
      success: false,
      message: "The ticket owner cannot be removed. Close the ticket instead.",
    };
  }

  await channel.permissionOverwrites.delete(user.id).catch(() =>
    channel.permissionOverwrites.edit(user.id, { ViewChannel: false })
  );

  const updated = client.ticketStore.removeParticipant(channel.id, user.id);

  if (!updated) {
    return {
      success: false,
      message: "Unable to update the ticket members.",
    };
  }

  const embed = buildInfoEmbed(
    "Participant Removed",
    `<@${user.id}> was removed from ticket ${buildTicketLabel(updated.ticketNumber)} by <@${member.id}>.`,
    TICKET_WARNING_COLOR
  );

  await channel.send({ embeds: [embed] });
  await sendLogMessage(guild, config, embed);

  return {
    success: true,
    message: `<@${user.id}> was removed from ticket ${buildTicketLabel(updated.ticketNumber)}.`,
    ticket: updated,
  };
};

export const closeTicket = async (options: {
  client: ExtendedClient;
  guild: Guild;
  channel: TextChannel;
  member: GuildMember;
  reason: string;
}): Promise<TicketActionResult> => {
  const { client, guild, channel, member, reason } = options;
  const config = client.ticketStore.getConfig(guild.id);
  const current = client.ticketStore.getOpenTicketByChannel(channel.id);

  if (!current) {
    return {
      success: false,
      message: "This channel is not an open ticket.",
    };
  }

  if (!canManageTicket(member, current, config)) {
    return {
      success: false,
      message: "Only the ticket owner or staff can close this ticket.",
    };
  }

  const closeReason = sanitiseParagraph(reason, "No reason provided.");
  let transcript: TranscriptExport | undefined;

  try {
    transcript = await buildTranscriptExport(channel, current);
  } catch {
    transcript = undefined;
  }

  const updated =
    client.ticketStore.closeTicket(channel.id, {
      closedById: member.id,
      reason: closeReason,
      transcriptFileName: transcript?.fileName ?? null,
    }) ?? current;

  const closeTime = updated.closedAt ?? new Date().toISOString();
  const embed = new EmbedBuilder()
    .setColor(TICKET_DANGER_COLOR)
    .setTitle(`Ticket ${buildTicketLabel(updated.ticketNumber)} Closed`)
    .setDescription(`Closed by <@${member.id}>`)
    .addFields(
      {
        name: "Subject",
        value: updated.subject,
        inline: false,
      },
      {
        name: "Reason",
        value: closeReason.slice(0, 1024),
        inline: false,
      },
      {
        name: "Duration",
        value: formatDuration(updated.createdAt, closeTime),
        inline: true,
      },
      {
        name: "Claimed By",
        value: updated.claimedById ? `<@${updated.claimedById}>` : "`unassigned`",
        inline: true,
      }
    )
    .setTimestamp();

  await channel.send({
    embeds: [
      buildInfoEmbed(
        "Closing Ticket",
        `Ticket ${buildTicketLabel(updated.ticketNumber)} will be deleted in 3 seconds.`,
        TICKET_DANGER_COLOR
      ),
    ],
  });

  await sendLogMessage(guild, config, embed, transcript);
  await notifyOwner(client, updated, closeReason, transcript);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await channel.delete(`Ticket ${buildTicketLabel(updated.ticketNumber)} closed by ${member.user.tag}`);

  return {
    success: true,
    message: `Ticket ${buildTicketLabel(updated.ticketNumber)} closed.`,
    ticket: updated,
  };
};

const buildCreateTicketModal = (): ModalBuilder =>
  new ModalBuilder()
    .setCustomId(TICKET_CUSTOM_IDS.createModal)
    .setTitle("Open Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_FIELD_IDS.subject)
          .setLabel("Subject")
          .setMaxLength(60)
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_FIELD_IDS.priority)
          .setLabel("Priority")
          .setRequired(true)
          .setValue("Medium")
          .setMaxLength(20)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_FIELD_IDS.reason)
          .setLabel("Describe the issue")
          .setMaxLength(1000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
      )
    );

const buildRenameTicketModal = (ticket: TicketRecord): ModalBuilder =>
  new ModalBuilder()
    .setCustomId(TICKET_CUSTOM_IDS.renameModal)
    .setTitle("Rename Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_FIELD_IDS.newName)
          .setLabel("New ticket name")
          .setRequired(true)
          .setValue(ticket.subject.slice(0, 100))
          .setMaxLength(60)
          .setStyle(TextInputStyle.Short)
      )
    );

const buildCloseTicketModal = (): ModalBuilder =>
  new ModalBuilder()
    .setCustomId(TICKET_CUSTOM_IDS.closeModal)
    .setTitle("Close Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_FIELD_IDS.closeReason)
          .setLabel("Reason for closure")
          .setRequired(false)
          .setMaxLength(1000)
          .setStyle(TextInputStyle.Paragraph)
      )
    );

const openTicketFromModal = async (
  interaction: ModalSubmitInteraction,
  client: ExtendedClient
): Promise<void> => {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Tickets can only be opened inside a server.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const config = client.ticketStore.getConfig(guild.id);
  const openTickets = client.ticketStore
    .getOpenTicketsByUser(guild.id, interaction.user.id)
    .filter((ticket) => guild.channels.cache.has(ticket.channelId));

  if (openTickets.length >= config.maxOpenTicketsPerUser) {
    await interaction.editReply({
      content: `You already have ${openTickets.length} open ticket(s). Limit: ${config.maxOpenTicketsPerUser}.`,
    });
    return;
  }

  const subject = sanitiseSingleLine(
    interaction.fields.getTextInputValue(TICKET_FIELD_IDS.subject),
    "Support Request"
  );
  const reason = sanitiseParagraph(
    interaction.fields.getTextInputValue(TICKET_FIELD_IDS.reason),
    "No details provided."
  );
  const priority = normalisePriority(
    interaction.fields.getTextInputValue(TICKET_FIELD_IDS.priority)
  );

  const staffRole = getStaffRole(guild, config);
  const parentId = getCategoryId(guild, config) ?? undefined;
  const botUserId = interaction.client.user?.id;

  if (!botUserId) {
    await interaction.editReply({
      content: "The bot user is not ready yet. Please try again.",
    });
    return;
  }

  const permissionOverwrites: OverwriteResolvable[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: botUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  if (staffRole) {
    permissionOverwrites.push({
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  const channel = (await guild.channels.create({
    name: `ticket-${slugify(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites,
  })) as TextChannel;

  const ticket = client.ticketStore.createTicket({
    guildId: guild.id,
    channelId: channel.id,
    ownerId: interaction.user.id,
    subject,
    reason,
    priority,
  });

  await channel.setName(buildTicketChannelName(ticket.ticketNumber, subject));
  await channel.setTopic(buildTicketTopic(ticket)).catch(() => undefined);

  const introEmbed = buildTicketOpenEmbed(ticket, interaction.user);
  const mentionContent = staffRole
    ? `<@${interaction.user.id}> <@&${staffRole.id}>`
    : `<@${interaction.user.id}>`;

  await channel.send({
    content: mentionContent,
    allowedMentions: {
      users: [interaction.user.id],
      roles: staffRole ? [staffRole.id] : [],
    },
    embeds: [introEmbed],
    components: buildTicketControls(),
  });

  await sendLogMessage(
    guild,
    config,
    buildInfoEmbed(
      "Ticket Opened",
      `Ticket ${buildTicketLabel(ticket.ticketNumber)} opened by <@${interaction.user.id}> in <#${channel.id}>.`,
      TICKET_SUCCESS_COLOR
    )
  );

  await interaction.editReply({
    content: `Ticket created: <#${channel.id}>`,
  });
};

export const handleTicketButtonInteraction = async (
  interaction: ButtonInteraction
): Promise<void> => {
  if (!interaction.inGuild() || !interaction.guild) {
    return;
  }

  const client = interaction.client as ExtendedClient;

  if (interaction.customId === TICKET_CUSTOM_IDS.createButton) {
    await interaction.showModal(buildCreateTicketModal());
    return;
  }

  const channel = getTicketTextChannel(interaction.channel);
  const ticket = client.ticketStore.getOpenTicketByChannel(interaction.channelId);

  if (!channel || !ticket) {
    await interaction.reply({
      content: "This action only works inside an open ticket channel.",
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const config = client.ticketStore.getConfig(interaction.guild.id);

  if (interaction.customId === TICKET_CUSTOM_IDS.claimButton) {
    const result = await claimTicket({
      client,
      guild: interaction.guild,
      channel,
      member,
    });

    await interaction.reply({
      content: result.message,
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === TICKET_CUSTOM_IDS.renameButton) {
    if (!canManageTicket(member, ticket, config)) {
      await interaction.reply({
        content: "Only the ticket owner or staff can rename this ticket.",
        ephemeral: true,
      });
      return;
    }

    await interaction.showModal(buildRenameTicketModal(ticket));
    return;
  }

  if (interaction.customId === TICKET_CUSTOM_IDS.closeButton) {
    if (!canManageTicket(member, ticket, config)) {
      await interaction.reply({
        content: "Only the ticket owner or staff can close this ticket.",
        ephemeral: true,
      });
      return;
    }

    await interaction.showModal(buildCloseTicketModal());
  }
};

export const handleTicketModalSubmit = async (
  interaction: ModalSubmitInteraction
): Promise<void> => {
  const client = interaction.client as ExtendedClient;

  if (interaction.customId === TICKET_CUSTOM_IDS.createModal) {
    await openTicketFromModal(interaction, client);
    return;
  }

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "This action only works inside a server.",
      ephemeral: true,
    });
    return;
  }

  const channel = getTicketTextChannel(interaction.channel);

  if (!channel) {
    await interaction.reply({
      content: "This action only works inside a text ticket channel.",
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (interaction.customId === TICKET_CUSTOM_IDS.renameModal) {
    await interaction.deferReply({ ephemeral: true });

    const result = await renameTicket({
      client,
      guild: interaction.guild,
      channel,
      member,
      newName: interaction.fields.getTextInputValue(TICKET_FIELD_IDS.newName),
    });

    await interaction.editReply({ content: result.message });
    return;
  }

  if (interaction.customId === TICKET_CUSTOM_IDS.closeModal) {
    await interaction.deferReply({ ephemeral: true });

    const result = await closeTicket({
      client,
      guild: interaction.guild,
      channel,
      member,
      reason:
        interaction.fields.getTextInputValue(TICKET_FIELD_IDS.closeReason) ||
        "No reason provided.",
    });

    await interaction.editReply({ content: result.message });
  }
};
