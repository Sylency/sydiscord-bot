import { resolve } from "path";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";

export interface AutoRoleConfig {
  enabled: boolean;
  roleIds: string[];
}

interface GuildAutoRoleState {
  config: AutoRoleConfig;
}

interface AutoRoleStoreData {
  guilds: Record<string, GuildAutoRoleState>;
}

const createDefaultConfig = (): AutoRoleConfig => ({
  enabled: false,
  roleIds: [],
});

const createDefaultStoreData = (): AutoRoleStoreData => ({
  guilds: {},
});

export class AutoRoleStore {
  private readonly filePath: string;
  private data: AutoRoleStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "autorole.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): AutoRoleStoreData {
    const raw = readJsonFile(this.filePath, createDefaultStoreData()) as {
      guilds?: Record<string, Partial<GuildAutoRoleState>>;
    };

    const guilds = Object.fromEntries(
      Object.entries(raw.guilds ?? {}).map(([guildId, guildState]) => [
        guildId,
        {
          config: {
            ...createDefaultConfig(),
            ...(guildState?.config ?? {}),
            roleIds: Array.isArray(guildState?.config?.roleIds)
              ? guildState?.config?.roleIds.filter(
                  (value): value is string => typeof value === "string"
                )
              : [],
          },
        } satisfies GuildAutoRoleState,
      ])
    );

    return { guilds };
  }

  private save(): void {
    writeJsonFile(this.filePath, this.data);
  }

  private ensureGuild(guildId: string): GuildAutoRoleState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = { config: createDefaultConfig() };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): AutoRoleConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<AutoRoleConfig>
  ): AutoRoleConfig {
    const guildState = this.ensureGuild(guildId);
    guildState.config = {
      ...guildState.config,
      ...patch,
      roleIds:
        patch.roleIds !== undefined ? patch.roleIds : guildState.config.roleIds,
    };
    this.save();
    return { ...guildState.config };
  }

  addRole(guildId: string, roleId: string): AutoRoleConfig {
    const config = this.ensureGuild(guildId).config;
    if (!config.roleIds.includes(roleId)) {
      config.roleIds.push(roleId);
      this.save();
    }
    return { ...config };
  }

  removeRole(guildId: string, roleId: string): AutoRoleConfig {
    const config = this.ensureGuild(guildId).config;
    config.roleIds = config.roleIds.filter((entry) => entry !== roleId);
    this.save();
    return { ...config };
  }
}
