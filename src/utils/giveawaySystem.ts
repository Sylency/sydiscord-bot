import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../types/index.js";
import { GiveawayRecord } from "./giveawayStore.js";

const giveawayButtonId = (giveawayId: string): string =>
  `giveaway:enter:${giveawayId}`;

export const buildGiveawayComponents = (giveawayId: string): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(giveawayButtonId(giveawayId))
      .setLabel("Enter Giveaway")
      .setStyle(ButtonStyle.Primary)
  ),
];

export const buildGiveawayEmbed = (giveaway: GiveawayRecord): EmbedBuilder => {
  const endTimestamp = Math.floor(new Date(giveaway.endAt).getTime() / 1000);

  return new EmbedBuilder()
    .setColor(0xfeca57)
    .setTitle("🎉 Giveaway")
    .setDescription(`**Prize:** ${giveaway.prize}`)
    .addFields(
      { name: "Winners", value: giveaway.winnerCount.toString(), inline: true },
      { name: "Ends", value: `<t:${endTimestamp}:R>`, inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
    .setTimestamp(new Date(giveaway.endAt));
};

export const buildGiveawayEndedEmbed = (
  giveaway: GiveawayRecord,
  winners: string[]
): EmbedBuilder => {
  const winnerText =
    winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "No valid entries";

  return new EmbedBuilder()
    .setColor(0x1dd1a1)
    .setTitle("✅ Giveaway Ended")
    .setDescription(`**Prize:** ${giveaway.prize}`)
    .addFields(
      { name: "Winners", value: winnerText, inline: false },
      { name: "Entries", value: giveaway.entries.length.toString(), inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${giveaway.id}` });
};

const pickWinners = (entries: string[], count: number): string[] => {
  const pool = [...new Set(entries)];
  const winners: string[] = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
};

export class GiveawayManager {
  private readonly client: ExtendedClient;
  private interval: NodeJS.Timeout | null = null;

  constructor(client: ExtendedClient) {
    this.client = client;
  }

  startScheduler(): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      void this.checkGiveaways();
    }, 15000);
  }

  stopScheduler(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private async checkGiveaways(): Promise<void> {
    const now = Date.now();

    for (const guild of this.client.guilds.cache.values()) {
      const giveaways = this.client.giveawayStore
        .getGiveaways(guild.id)
        .filter((entry) => entry.status === "active");

      for (const giveaway of giveaways) {
        if (new Date(giveaway.endAt).getTime() <= now) {
          await this.endGiveaway(guild, giveaway.id);
        }
      }
    }
  }

  async endGiveaway(guild: Guild, giveawayId: string): Promise<void> {
    const giveaway = this.client.giveawayStore.getGiveaway(guild.id, giveawayId);
    if (!giveaway || giveaway.status === "ended") return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      this.client.giveawayStore.updateGiveaway(guild.id, giveawayId, {
        status: "ended",
      });
      return;
    }

    let message;
    try {
      message = await (channel as TextChannel).messages.fetch(giveaway.messageId);
    } catch {
      message = null;
    }

    const winners = pickWinners(giveaway.entries, giveaway.winnerCount);

    this.client.giveawayStore.updateGiveaway(guild.id, giveawayId, {
      status: "ended",
    });

    if (message) {
      await message.edit({
        embeds: [buildGiveawayEndedEmbed(giveaway, winners)],
        components: [],
      });
    }

    if (winners.length > 0) {
      await (channel as TextChannel).send(
        `🎉 Congrats ${winners.map((id) => `<@${id}>`).join(", ")}! You won **${giveaway.prize}**.`
      );
    } else {
      await (channel as TextChannel).send(
        `Giveaway ended for **${giveaway.prize}**, but no valid entries.`
      );
    }
  }

  async handleEntry(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;

    const [, , giveawayId] = interaction.customId.split(":");
    const giveaway = this.client.giveawayStore.getGiveaway(
      interaction.guildId,
      giveawayId
    );

    if (!giveaway || giveaway.status !== "active") {
      await interaction.reply({
        content: "This giveaway is no longer active.",
        ephemeral: true,
      });
      return;
    }

    if (giveaway.entries.includes(interaction.user.id)) {
      await interaction.reply({
        content: "You are already entered in this giveaway.",
        ephemeral: true,
      });
      return;
    }

    giveaway.entries.push(interaction.user.id);
    this.client.giveawayStore.updateGiveaway(interaction.guildId, giveawayId, {
      entries: giveaway.entries,
    });

    await interaction.reply({
      content: "You are now entered! 🎉",
      ephemeral: true,
    });
  }
}
