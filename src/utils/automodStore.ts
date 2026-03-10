import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export type AutomodAction = "delete" | "timeout";

export interface GuildAutomodConfig {
  enabled: boolean;
  antiLinks: boolean;
  antiInvites: boolean;
  antiCaps: boolean;
  capsPercent: number;
  capsMinLength: number;
  antiSpam: boolean;
  spamMessages: number;
  spamSeconds: number;
  antiMention: boolean;
  mentionLimit: number;
  badWords: string[];
  logChannelId: string | null;
  action: AutomodAction;
  timeoutSeconds: number;
  exemptRoles: string[];
  exemptChannels: string[];
}

interface GuildAutomodState {
  config: GuildAutomodConfig;
}

interface AutomodStoreData {
  guilds: Record<string, GuildAutomodState>;
}

const createDefaultConfig = (): GuildAutomodConfig => ({
  enabled: true,
  antiLinks: true,
  antiInvites: true,
  antiCaps: true,
  capsPercent: 70,
  capsMinLength: 12,
  antiSpam: true,
  spamMessages: 5,
  spamSeconds: 8,
  antiMention: true,
  mentionLimit: 5,
  badWords: [],
  logChannelId: null,
  action: "delete",
  timeoutSeconds: 300,
  exemptRoles: [],
  exemptChannels: [],
});

const createDefaultStoreData = (): AutomodStoreData => ({
  guilds: {},
});

export class AutomodStore {
  private readonly filePath: string;
  private data: AutomodStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "automod.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): AutomodStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildAutomodState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          config: {
            ...createDefaultConfig(),
            ...(guildState?.config ?? {}),
            badWords: Array.isArray(guildState?.config?.badWords)
              ? guildState?.config?.badWords.filter(
                  (value): value is string => typeof value === "string"
                )
              : [],
            exemptRoles: Array.isArray(guildState?.config?.exemptRoles)
              ? guildState?.config?.exemptRoles.filter(
                  (value): value is string => typeof value === "string"
                )
              : [],
            exemptChannels: Array.isArray(guildState?.config?.exemptChannels)
              ? guildState?.config?.exemptChannels.filter(
                  (value): value is string => typeof value === "string"
                )
              : [],
          },
        } satisfies GuildAutomodState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildAutomodState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = { config: createDefaultConfig() };
      this.save();
    }

    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): GuildAutomodConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<GuildAutomodConfig>
  ): GuildAutomodConfig {
    const guildState = this.ensureGuild(guildId);
    guildState.config = {
      ...guildState.config,
      ...patch,
      badWords:
        patch.badWords !== undefined
          ? patch.badWords
          : guildState.config.badWords,
      exemptRoles:
        patch.exemptRoles !== undefined
          ? patch.exemptRoles
          : guildState.config.exemptRoles,
      exemptChannels:
        patch.exemptChannels !== undefined
          ? patch.exemptChannels
          : guildState.config.exemptChannels,
    };
    this.save();
    return { ...guildState.config };
  }

  addBadWord(guildId: string, word: string): GuildAutomodConfig {
    const config = this.ensureGuild(guildId).config;
    const normalized = word.toLowerCase();
    if (!config.badWords.includes(normalized)) {
      config.badWords.push(normalized);
      this.save();
    }
    return { ...config };
  }

  removeBadWord(guildId: string, word: string): GuildAutomodConfig {
    const config = this.ensureGuild(guildId).config;
    const normalized = word.toLowerCase();
    config.badWords = config.badWords.filter((entry) => entry !== normalized);
    this.save();
    return { ...config };
  }
}
