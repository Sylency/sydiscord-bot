import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
} from "discord.js";
import { ExtendedClient } from "../types/index.js";

const clamp = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

export const showWelcomeModal = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const client = interaction.client as ExtendedClient;
  const config = client.welcomeStore.getConfig(interaction.guild!.id);

  const modal = new ModalBuilder()
    .setCustomId("welcome:edit")
    .setTitle("Welcome Editor");

  const titleInput = new TextInputBuilder()
    .setCustomId("welcome:title")
    .setLabel("Embed title")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256)
    .setValue(clamp(config.embedTitle, 256));

  const messageInput = new TextInputBuilder()
    .setCustomId("welcome:message")
    .setLabel("Message content (ping text)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setValue(clamp(config.message, 1000));

  const descriptionInput = new TextInputBuilder()
    .setCustomId("welcome:description")
    .setLabel("Embed description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setValue(clamp(config.embedDescription, 2000));

  const imageInput = new TextInputBuilder()
    .setCustomId("welcome:image")
    .setLabel("Embed image URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(400)
    .setValue(clamp(config.embedImageUrl ?? "", 400));

  const footerInput = new TextInputBuilder()
    .setCustomId("welcome:footer")
    .setLabel("Footer text (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(200)
    .setValue(clamp(config.footerText ?? "", 200));

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput)
  );

  await interaction.showModal(modal);
};

export const handleWelcomeModal = async (
  interaction: ModalSubmitInteraction
): Promise<void> => {
  if (!interaction.inGuild() || !interaction.guild) return;

  const client = interaction.client as ExtendedClient;

  const embedTitle = interaction.fields.getTextInputValue("welcome:title").trim();
  const message = interaction.fields.getTextInputValue("welcome:message").trim();
  const embedDescription = interaction.fields
    .getTextInputValue("welcome:description")
    .trim();
  const embedImageUrl = interaction.fields
    .getTextInputValue("welcome:image")
    .trim();
  const footerText = interaction.fields
    .getTextInputValue("welcome:footer")
    .trim();

  client.welcomeStore.updateConfig(interaction.guild.id, {
    embedTitle,
    message,
    embedDescription,
    embedImageUrl: embedImageUrl.length ? embedImageUrl : null,
    footerText: footerText.length ? footerText : null,
  });

  await interaction.reply({
    content: "Welcome embed updated.",
    ephemeral: true,
  });
};
