import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ExtendedClient } from "../types/index.js";

interface PendingCaptcha {
  code: string;
  expiresAt: number;
}

const pendingCaptchas = new Map<string, PendingCaptcha>();

const buildCaptchaCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const buildKey = (guildId: string, userId: string): string => `${guildId}:${userId}`;

export const buildVerificationPanelEmbed = (
  title: string,
  description: string
): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(0x4b7bec)
    .setTitle(title)
    .setDescription(description);

export const buildVerificationPanelComponents = (): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("verify:open")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  ),
];

export const handleVerificationButton = async (
  interaction: ButtonInteraction
): Promise<void> => {
  if (!interaction.inGuild()) return;

  const client = interaction.client as ExtendedClient;
  const config = client.verificationStore.getConfig(interaction.guildId);

  if (!config.enabled || !config.roleId) {
    await interaction.reply({
      content: "Verification is not configured yet.",
      ephemeral: true,
    });
    return;
  }

  const code = buildCaptchaCode();
  pendingCaptchas.set(buildKey(interaction.guildId, interaction.user.id), {
    code,
    expiresAt: Date.now() + 2 * 60 * 1000,
  });

  const modal = new ModalBuilder()
    .setCustomId("verify:captcha")
    .setTitle(`Captcha: ${code}`);

  const input = new TextInputBuilder()
    .setCustomId("verify:answer")
    .setLabel("Type the captcha code")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(6)
    .setMaxLength(6)
    .setPlaceholder("Enter the code exactly");

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

  await interaction.showModal(modal);
};

export const handleVerificationModal = async (
  interaction: ModalSubmitInteraction
): Promise<void> => {
  if (!interaction.inGuild()) return;

  const client = interaction.client as ExtendedClient;
  const config = client.verificationStore.getConfig(interaction.guildId);
  if (!config.enabled || !config.roleId) {
    await interaction.reply({
      content: "Verification is not configured yet.",
      ephemeral: true,
    });
    return;
  }

  const key = buildKey(interaction.guildId, interaction.user.id);
  const pending = pendingCaptchas.get(key);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingCaptchas.delete(key);
    await interaction.reply({
      content: "Captcha expired. Please press Verify again.",
      ephemeral: true,
    });
    return;
  }

  const answer = interaction.fields.getTextInputValue("verify:answer").trim().toUpperCase();
  if (answer !== pending.code) {
    await interaction.reply({
      content: "Captcha failed. Please try again.",
      ephemeral: true,
    });
    return;
  }

  pendingCaptchas.delete(key);

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "Member not found.", ephemeral: true });
    return;
  }

  await member.roles.add(config.roleId).catch(() => null);

  await interaction.reply({
    content: "Verification completed. Welcome!",
    ephemeral: true,
  });
};
