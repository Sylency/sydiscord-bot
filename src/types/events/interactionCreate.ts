import { BaseInteraction, EmbedBuilder } from "discord.js";
import { BotEvent, ExtendedClient } from "../types/index.js";

const event: BotEvent = {
  name: "interactionCreate",
  async execute(interaction: BaseInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`⚠️  No command matching /${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(
        `❌ Error executing /${interaction.commandName}:`,
        error
      );

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("❌ Something went wrong")
        .setDescription("An error occurred while running this command.")
        .setTimestamp();

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [errorEmbed],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });
      }
    }
  },
};

module.exports = event;
