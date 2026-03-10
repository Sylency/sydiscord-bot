import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export interface LevelsConfig {
  enabled: boolean;
  xpMin: number;
  xpMax: number;
  cooldownSeconds: number;
  levelUpChannelId: string | null;
}

export interface LevelUserState {
  xp: number;
  level: number;
  lastMessageAt: string | null;
}

interface GuildLevelsState {
  config: LevelsConfig;
  users: Record<string, LevelUserState>;
}

interface LevelsStoreData {
  guilds: Record<string, GuildLevelsState>;
}

const createDefaultConfig = (): LevelsConfig => ({
  enabled: true,
  xpMin: 15,
  xpMax: 25,
  cooldownSeconds: 60,
  levelUpChannelId: null,
});

const createDefaultStoreData = (): LevelsStoreData => ({
  guilds: {},
});

export class LevelsStore {
  private readonly filePath: string;
  private data: LevelsStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "levels.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): LevelsStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildLevelsState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          config: {
            ...createDefaultConfig(),
            ...(guildState?.config ?? {}),
          },
          users: Object.fromEntries(
            Object.entries(guildState?.users ?? {}).map(([userId, userState]) => [
              userId,
              {
                xp:
                  typeof userState?.xp === "number" && userState.xp >= 0
                    ? userState.xp
                    : 0,
                level:
                  typeof userState?.level === "number" && userState.level >= 0
                    ? userState.level
                    : 0,
                lastMessageAt: userState?.lastMessageAt ?? null,
              },
            ])
          ),
        } satisfies GuildLevelsState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildLevelsState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {
        config: createDefaultConfig(),
        users: {},
      };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): LevelsConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<LevelsConfig>
  ): LevelsConfig {
    const guildState = this.ensureGuild(guildId);
    guildState.config = { ...guildState.config, ...patch };
    this.save();
    return { ...guildState.config };
  }

  getUser(guildId: string, userId: string): LevelUserState {
    const guildState = this.ensureGuild(guildId);
    if (!guildState.users[userId]) {
      guildState.users[userId] = { xp: 0, level: 0, lastMessageAt: null };
      this.save();
    }
    return { ...guildState.users[userId] };
  }

  updateUser(
    guildId: string,
    userId: string,
    patch: Partial<LevelUserState>
  ): LevelUserState {
    const guildState = this.ensureGuild(guildId);
    const current = guildState.users[userId] ?? {
      xp: 0,
      level: 0,
      lastMessageAt: null,
    };
    guildState.users[userId] = { ...current, ...patch };
    this.save();
    return { ...guildState.users[userId] };
  }

  getLeaderboard(guildId: string, limit = 10): Array<{ userId: string; xp: number; level: number }> {
    const guildState = this.ensureGuild(guildId);
    return Object.entries(guildState.users)
      .map(([userId, data]) => ({
        userId,
        xp: data.xp,
        level: data.level,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, Math.max(1, limit));
  }
}
