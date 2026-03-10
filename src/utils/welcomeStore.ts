import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export interface WelcomeConfig {
  enabled: boolean;
  channelId: string | null;
  message: string;
  embedTitle: string;
  embedDescription: string;
  color: number;
  mentionUser: boolean;
  includeAvatar: boolean;
}

interface GuildWelcomeState {
  config: WelcomeConfig;
}

interface WelcomeStoreData {
  guilds: Record<string, GuildWelcomeState>;
}

const createDefaultConfig = (): WelcomeConfig => ({
  enabled: true,
  channelId: null,
  message: "Welcome {user} to **{server}**!",
  embedTitle: "Welcome!",
  embedDescription:
    "Hey {user}, you are the **#{memberCount}** member of **{server}**.",
  color: 0x6c5ce7,
  mentionUser: true,
  includeAvatar: true,
});

const createDefaultStoreData = (): WelcomeStoreData => ({
  guilds: {},
});

export class WelcomeStore {
  private readonly filePath: string;
  private data: WelcomeStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "welcome.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): WelcomeStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildWelcomeState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          config: {
            ...createDefaultConfig(),
            ...(guildState?.config ?? {}),
          },
        } satisfies GuildWelcomeState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildWelcomeState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = { config: createDefaultConfig() };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): WelcomeConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<WelcomeConfig>
  ): WelcomeConfig {
    const guildState = this.ensureGuild(guildId);
    guildState.config = { ...guildState.config, ...patch };
    this.save();
    return { ...guildState.config };
  }
}
