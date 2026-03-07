import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Replies with the bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsHeartbeat = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "📡 Roundtrip", value: `\`${roundtrip}ms\``, inline: true },
        { name: "💓 WebSocket", value: `\`${wsHeartbeat}ms\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};

module.exports = command;
