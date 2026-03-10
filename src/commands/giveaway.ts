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
  buildGiveawayComponents,
  buildGiveawayEmbed,
} from "../utils/giveawaySystem.js";

const createGiveawayId = (): string =>
  `gw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaway system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a giveaway")
        .addStringOption((option) =>
          option
            .setName("prize")
            .setDescription("Prize")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("duration_minutes")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Number of winners")
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Target channel")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption((option) =>
          option
            .setName("giveaway_id")
            .setDescription("Giveaway ID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reroll")
        .setDescription("Reroll winners for an ended giveaway")
        .addStringOption((option) =>
          option
            .setName("giveaway_id")
            .setDescription("Giveaway ID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List active giveaways")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Configure giveaway logs")
        .addChannelOption((option) =>
          option
            .setName("log_channel")
            .setDescription("Log channel for giveaway events")
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
        content: "You need Manage Server permissions to manage giveaways.",
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "start") {
      const prize = interaction.options.getString("prize", true);
      const durationMinutes = interaction.options.getInteger(
        "duration_minutes",
        true
      );
      const winners = interaction.options.getInteger("winners") ?? 1;

      const target =
        interaction.options.getChannel("channel") ?? interaction.channel;
      if (!target || target.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "Target must be a text channel.",
          ephemeral: true,
        });
        return;
      }
      const textChannel = target as TextChannel;

      const giveawayId = createGiveawayId();
      const endAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      const giveaway = {
        id: giveawayId,
        guildId: interaction.guild.id,
        channelId: target.id,
        messageId: "",
        prize,
        winnerCount: winners,
        createdById: interaction.user.id,
        endAt,
        status: "active" as const,
        entries: [],
      };

      const message = await textChannel.send({
        embeds: [buildGiveawayEmbed(giveaway)],
        components: buildGiveawayComponents(giveawayId),
      });

      giveaway.messageId = message.id;
      client.giveawayStore.addGiveaway(interaction.guild.id, giveaway);

      await interaction.reply({
        content: `Giveaway started in <#${target.id}>. ID: ${giveawayId}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "end") {
      const giveawayId = interaction.options.getString("giveaway_id", true);
      await client.giveawayManager.endGiveaway(interaction.guild, giveawayId);
      await interaction.reply({
        content: `Giveaway ${giveawayId} ended.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "reroll") {
      const giveawayId = interaction.options.getString("giveaway_id", true);
      const giveaway = client.giveawayStore.getGiveaway(
        interaction.guild.id,
        giveawayId
      );
      if (!giveaway || giveaway.status !== "ended") {
        await interaction.reply({
          content: "Giveaway not found or still active.",
          ephemeral: true,
        });
        return;
      }

      giveaway.status = "active";
      client.giveawayStore.updateGiveaway(interaction.guild.id, giveawayId, {
        status: "active",
      });
      await client.giveawayManager.endGiveaway(interaction.guild, giveawayId);
      await interaction.reply({
        content: `Rerolled giveaway ${giveawayId}.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "list") {
      const giveaways = client.giveawayStore
        .getGiveaways(interaction.guild.id)
        .filter((entry) => entry.status === "active");
      const description = giveaways.length
        ? giveaways
            .map(
              (entry) =>
                `**${entry.id}** • ${entry.prize} • ends <t:${Math.floor(
                  new Date(entry.endAt).getTime() / 1000
                )}:R>`
            )
            .join("\n")
        : "No active giveaways.";

      const embed = new EmbedBuilder()
        .setColor(0xfeca57)
        .setTitle("Active Giveaways")
        .setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "config") {
      const channel = interaction.options.getChannel("log_channel");
      client.giveawayStore.setLogChannelId(
        interaction.guild.id,
        channel?.id ?? null
      );
      await interaction.reply({
        content: channel
          ? `Giveaway logs set to <#${channel.id}>.`
          : "Giveaway logs disabled.",
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
