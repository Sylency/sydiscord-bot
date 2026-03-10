import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";
import { getNextLevelXp } from "../utils/levelsSystem.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("levels")
    .setDescription("Level system commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("profile")
        .setDescription("Show a user's level")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to check")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Show the top users")
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of users to show")
            .setMinValue(3)
            .setMaxValue(20)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Configure the level system")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Enable leveling")
        )
        .addIntegerOption((option) =>
          option
            .setName("xp_min")
            .setDescription("Min XP per message")
            .setMinValue(5)
            .setMaxValue(50)
        )
        .addIntegerOption((option) =>
          option
            .setName("xp_max")
            .setDescription("Max XP per message")
            .setMinValue(5)
            .setMaxValue(50)
        )
        .addIntegerOption((option) =>
          option
            .setName("cooldown")
            .setDescription("Cooldown in seconds")
            .setMinValue(10)
            .setMaxValue(300)
        )
        .addChannelOption((option) =>
          option
            .setName("levelup_channel")
            .setDescription("Channel for level up messages")
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

    const client = interaction.client as ExtendedClient;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "profile") {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const data = client.levelsStore.getUser(interaction.guild.id, user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00cec9)
        .setTitle(`${user.username}'s Level`)
        .addFields(
          { name: "Level", value: data.level.toString(), inline: true },
          { name: "XP", value: data.xp.toString(), inline: true },
          { name: "Next Level", value: getNextLevelXp(data.level).toString(), inline: true }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "leaderboard") {
      const limit = interaction.options.getInteger("limit") ?? 10;
      const leaderboard = client.levelsStore.getLeaderboard(
        interaction.guild.id,
        limit
      );
      const description = leaderboard.length
        ? leaderboard
            .map(
              (entry, index) =>
                `**${index + 1}.** <@${entry.userId}> • Level ${entry.level} • ${entry.xp} XP`
            )
            .join("\n")
        : "No data yet.";

      const embed = new EmbedBuilder()
        .setColor(0x00cec9)
        .setTitle("Leaderboard")
        .setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "config") {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
        await interaction.reply({
          content: "You need Manage Server permissions to configure levels.",
          ephemeral: true,
        });
        return;
      }

      const config = client.levelsStore.updateConfig(interaction.guild.id, {
        enabled: interaction.options.getBoolean("enabled") ?? undefined,
        xpMin: interaction.options.getInteger("xp_min") ?? undefined,
        xpMax: interaction.options.getInteger("xp_max") ?? undefined,
        cooldownSeconds: interaction.options.getInteger("cooldown") ?? undefined,
        levelUpChannelId:
          interaction.options.getChannel("levelup_channel")?.id ?? undefined,
      });

      const embed = new EmbedBuilder()
        .setColor(0x00cec9)
        .setTitle("Levels Config Updated")
        .setDescription(
          `Enabled: **${config.enabled ? "Yes" : "No"}** • XP: ${config.xpMin}-${config.xpMax} • Cooldown: ${config.cooldownSeconds}s`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

module.exports = command;
