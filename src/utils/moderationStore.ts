import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export interface WarningRecord {
  id: number;
  moderatorId: string;
  reason: string;
  createdAt: string;
}

interface GuildModerationState {
  nextWarningId: number;
  warnings: Record<string, WarningRecord[]>;
}

interface ModerationStoreData {
  guilds: Record<string, GuildModerationState>;
}

const createDefaultGuildState = (): GuildModerationState => ({
  nextWarningId: 1,
  warnings: {},
});

const createDefaultStoreData = (): ModerationStoreData => ({
  guilds: {},
});

export class ModerationStore {
  private readonly filePath: string;
  private data: ModerationStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "moderation.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): ModerationStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildModerationState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          nextWarningId:
            typeof guildState?.nextWarningId === "number" &&
            guildState.nextWarningId > 0
              ? guildState.nextWarningId
              : 1,
          warnings: Object.fromEntries(
            Object.entries(guildState?.warnings ?? {}).map(
              ([userId, warnings]) => [
                userId,
                Array.isArray(warnings)
                  ? warnings
                      .filter((entry): entry is WarningRecord => !!entry)
                      .map((entry) => ({
                        id:
                          typeof entry.id === "number" ? entry.id : 0,
                        moderatorId: entry.moderatorId ?? "",
                        reason: entry.reason ?? "No reason provided.",
                        createdAt: entry.createdAt ?? new Date(0).toISOString(),
                      }))
                  : [],
              ]
            )
          ),
        } satisfies GuildModerationState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildModerationState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = createDefaultGuildState();
      this.save();
    }

    return this.data.guilds[guildId];
  }

  addWarning(
    guildId: string,
    userId: string,
    moderatorId: string,
    reason: string
  ): WarningRecord {
    const guildState = this.ensureGuild(guildId);
    const warning: WarningRecord = {
      id: guildState.nextWarningId++,
      moderatorId,
      reason,
      createdAt: new Date().toISOString(),
    };

    const list = guildState.warnings[userId] ?? [];
    list.push(warning);
    guildState.warnings[userId] = list;
    this.save();
    return warning;
  }

  getWarnings(guildId: string, userId: string): WarningRecord[] {
    const guildState = this.ensureGuild(guildId);
    return [...(guildState.warnings[userId] ?? [])];
  }

  removeWarning(
    guildId: string,
    userId: string,
    warningId: number
  ): WarningRecord | null {
    const guildState = this.ensureGuild(guildId);
    const warnings = guildState.warnings[userId] ?? [];
    const index = warnings.findIndex((entry) => entry.id === warningId);
    if (index === -1) return null;

    const [removed] = warnings.splice(index, 1);
    guildState.warnings[userId] = warnings;
    this.save();
    return removed ?? null;
  }
}
