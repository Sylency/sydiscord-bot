import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Music system (direct URLs only)")
    .addSubcommand((subcommand) =>
      subcommand.setName("join").setDescription("Join your voice channel")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Play a direct audio URL")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("Direct audio URL")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("skip").setDescription("Skip current track")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("stop").setDescription("Stop and clear queue")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("leave").setDescription("Leave the voice channel")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("queue").setDescription("Show the queue")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("nowplaying").setDescription("Show current track")
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
    const member = await interaction.guild.members.fetch(interaction.user.id);

    const voiceChannel = member.voice.channel;

    if (["join", "play"].includes(subcommand) && !voiceChannel) {
      await interaction.reply({
        content: "You must be in a voice channel.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "join") {
      await client.musicManager.join(member, voiceChannel!);
      await interaction.reply({
        content: `Joined **${voiceChannel!.name}**.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "play") {
      const url = interaction.options.getString("url", true);
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        await interaction.reply({
          content: "Please provide a valid direct URL (http/https).",
          ephemeral: true,
        });
        return;
      }

      const state = await client.musicManager.join(member, voiceChannel!);
      client.musicManager.enqueue(interaction.guild.id, {
        url,
        requestedBy: interaction.user.id,
      });

      if (!state.nowPlaying) {
        await client.musicManager.playNext(interaction.guild.id);
      }

      await interaction.reply({
        content: "Track added to the queue.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "skip") {
      client.musicManager.skip(interaction.guild.id);
      await interaction.reply({ content: "Skipped.", ephemeral: true });
      return;
    }

    if (subcommand === "stop") {
      client.musicManager.stop(interaction.guild.id);
      await interaction.reply({ content: "Stopped and cleared queue.", ephemeral: true });
      return;
    }

    if (subcommand === "leave") {
      client.musicManager.leave(interaction.guild.id);
      await interaction.reply({ content: "Left the channel.", ephemeral: true });
      return;
    }

    if (subcommand === "queue") {
      const state = client.musicManager.getState(interaction.guild.id);
      const description = state?.queue.length
        ? state.queue
            .map((item, index) => `**${index + 1}.** ${item.url}`)
            .join("\n")
        : "Queue is empty.";

      const embed = new EmbedBuilder()
        .setColor(0x5f27cd)
        .setTitle("Music Queue")
        .setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === "nowplaying") {
      const state = client.musicManager.getState(interaction.guild.id);
      const nowPlaying = state?.nowPlaying;
      await interaction.reply({
        content: nowPlaying ? `Now playing: ${nowPlaying.url}` : "Nothing playing.",
        ephemeral: true,
      });
    }
  },
};

module.exports = command;
