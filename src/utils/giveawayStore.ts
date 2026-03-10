import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export type GiveawayStatus = "active" | "ended";

export interface GiveawayRecord {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  prize: string;
  winnerCount: number;
  createdById: string;
  endAt: string;
  status: GiveawayStatus;
  entries: string[];
}

interface GuildGiveawayState {
  giveaways: GiveawayRecord[];
  logChannelId: string | null;
}

interface GiveawayStoreData {
  guilds: Record<string, GuildGiveawayState>;
}

const createDefaultGuildState = (): GuildGiveawayState => ({
  giveaways: [],
  logChannelId: null,
});

const createDefaultStoreData = (): GiveawayStoreData => ({
  guilds: {},
});

const normalizeGiveaway = (giveaway: Partial<GiveawayRecord>): GiveawayRecord => ({
  id: giveaway.id ?? "",
  guildId: giveaway.guildId ?? "",
  channelId: giveaway.channelId ?? "",
  messageId: giveaway.messageId ?? "",
  prize: giveaway.prize ?? "Mystery prize",
  winnerCount:
    typeof giveaway.winnerCount === "number" && giveaway.winnerCount > 0
      ? giveaway.winnerCount
      : 1,
  createdById: giveaway.createdById ?? "",
  endAt: giveaway.endAt ?? new Date(0).toISOString(),
  status: giveaway.status === "ended" ? "ended" : "active",
  entries: Array.isArray(giveaway.entries)
    ? giveaway.entries.filter((value): value is string => typeof value === "string")
    : [],
});

export class GiveawayStore {
  private readonly filePath: string;
  private data: GiveawayStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "giveaways.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): GiveawayStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildGiveawayState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          giveaways: Array.isArray(guildState?.giveaways)
            ? guildState?.giveaways.map((entry) => normalizeGiveaway(entry))
            : [],
          logChannelId:
            typeof guildState?.logChannelId === "string"
              ? guildState.logChannelId
              : null,
        } satisfies GuildGiveawayState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildGiveawayState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = createDefaultGuildState();
      this.save();
    }
    return this.data.guilds[guildId];
  }

  getLogChannelId(guildId: string): string | null {
    return this.ensureGuild(guildId).logChannelId;
  }

  setLogChannelId(guildId: string, channelId: string | null): void {
    const guildState = this.ensureGuild(guildId);
    guildState.logChannelId = channelId;
    this.save();
  }

  getGiveaways(guildId: string): GiveawayRecord[] {
    return this.ensureGuild(guildId).giveaways.map((entry) => ({ ...entry }));
  }

  getGiveaway(guildId: string, giveawayId: string): GiveawayRecord | null {
    const giveaway = this.ensureGuild(guildId).giveaways.find(
      (entry) => entry.id === giveawayId
    );
    return giveaway ? { ...giveaway } : null;
  }

  addGiveaway(guildId: string, giveaway: GiveawayRecord): void {
    const guildState = this.ensureGuild(guildId);
    guildState.giveaways.push(giveaway);
    this.save();
  }

  updateGiveaway(
    guildId: string,
    giveawayId: string,
    patch: Partial<GiveawayRecord>
  ): GiveawayRecord | null {
    const guildState = this.ensureGuild(guildId);
    const giveaway = guildState.giveaways.find((entry) => entry.id === giveawayId);
    if (!giveaway) return null;

    Object.assign(giveaway, patch);
    this.save();
    return { ...giveaway };
  }
}
