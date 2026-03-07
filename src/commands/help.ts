import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand, ExtendedClient } from "../types/index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("📖 List all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;

    const commandList = client.commands
      .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Available Commands")
      .setDescription(commandList || "No commands available.")
      .setFooter({ text: `${client.commands.size} command(s) loaded` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

module.exports = command;
