import { BaseInteraction, EmbedBuilder } from "discord.js";
import { BotEvent, ExtendedClient } from "../types/index.js";
import {
  handleTicketButtonInteraction,
  handleTicketModalSubmit,
} from "../utils/ticketSystem.js";
import {
  handleVerificationButton,
  handleVerificationModal,
} from "../utils/verificationSystem.js";

const event: BotEvent = {
  name: "interactionCreate",
  async execute(interaction: BaseInteraction) {
    try {
      if (interaction.isChatInputCommand()) {
        const client = interaction.client as ExtendedClient;
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          console.warn(`⚠️  No command matching /${interaction.commandName}`);
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("ticket:")
      ) {
        await handleTicketButtonInteraction(interaction);
        return;
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("ticket:")
      ) {
        await handleTicketModalSubmit(interaction);
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("verify:")
      ) {
        await handleVerificationButton(interaction);
        return;
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("verify:")
      ) {
        await handleVerificationModal(interaction);
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("giveaway:")
      ) {
        const client = interaction.client as ExtendedClient;
        await client.giveawayManager.handleEntry(interaction);
      }
    } catch (error) {
      const interactionName = interaction.isChatInputCommand()
        ? `/${interaction.commandName}`
        : interaction.isButton() || interaction.isModalSubmit()
          ? interaction.customId
          : interaction.type;

      console.error(`❌ Error handling interaction ${interactionName}:`, error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("Something went wrong")
        .setDescription("An error occurred while handling this interaction.")
        .setTimestamp();

      if (interaction.isRepliable()) {
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
    }
  },
};

module.exports = event;
