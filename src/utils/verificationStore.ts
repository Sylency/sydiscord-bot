import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export interface VerificationConfig {
  enabled: boolean;
  channelId: string | null;
  roleId: string | null;
  promptTitle: string;
  promptDescription: string;
}

interface GuildVerificationState {
  config: VerificationConfig;
}

interface VerificationStoreData {
  guilds: Record<string, GuildVerificationState>;
}

const createDefaultConfig = (): VerificationConfig => ({
  enabled: true,
  channelId: null,
  roleId: null,
  promptTitle: "Verification Required",
  promptDescription: "Click the button below and solve the captcha to verify.",
});

const createDefaultStoreData = (): VerificationStoreData => ({
  guilds: {},
});

export class VerificationStore {
  private readonly filePath: string;
  private data: VerificationStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "verification.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): VerificationStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildVerificationState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          config: {
            ...createDefaultConfig(),
            ...(guildState?.config ?? {}),
          },
        } satisfies GuildVerificationState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildVerificationState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = { config: createDefaultConfig() };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): VerificationConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<VerificationConfig>
  ): VerificationConfig {
    const guildState = this.ensureGuild(guildId);
    guildState.config = { ...guildState.config, ...patch };
    this.save();
    return { ...guildState.config };
  }
}
