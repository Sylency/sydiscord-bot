import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

export interface GuildTicketConfig {
  categoryId: string | null;
  staffRoleId: string | null;
  logChannelId: string | null;
  panelChannelId: string | null;
  maxOpenTicketsPerUser: number;
}

export interface TicketRecord {
  ticketNumber: number;
  guildId: string;
  channelId: string;
  ownerId: string;
  subject: string;
  reason: string;
  priority: string;
  status: "open" | "closed";
  participants: string[];
  createdAt: string;
  claimedById: string | null;
  closedAt: string | null;
  closedById: string | null;
  closedReason: string | null;
  transcriptFileName: string | null;
}

interface GuildTicketStats {
  totalOpened: number;
  totalClosed: number;
}

interface GuildTicketState {
  config: GuildTicketConfig;
  nextTicketNumber: number;
  tickets: TicketRecord[];
  stats: GuildTicketStats;
}

interface TicketStoreData {
  guilds: Record<string, GuildTicketState>;
}

export interface CreateTicketInput {
  guildId: string;
  channelId: string;
  ownerId: string;
  subject: string;
  reason: string;
  priority: string;
  participants?: string[];
}

export interface CloseTicketInput {
  closedById: string;
  reason: string;
  transcriptFileName?: string | null;
}

const createDefaultConfig = (): GuildTicketConfig => ({
  categoryId: null,
  staffRoleId: null,
  logChannelId: null,
  panelChannelId: null,
  maxOpenTicketsPerUser: 1,
});

const createDefaultGuildState = (): GuildTicketState => ({
  config: createDefaultConfig(),
  nextTicketNumber: 1,
  tickets: [],
  stats: {
    totalOpened: 0,
    totalClosed: 0,
  },
});

const createDefaultStoreData = (): TicketStoreData => ({
  guilds: {},
});

const normaliseTicket = (ticket: Partial<TicketRecord>): TicketRecord => ({
  ticketNumber:
    typeof ticket.ticketNumber === "number" && Number.isInteger(ticket.ticketNumber)
      ? ticket.ticketNumber
      : 0,
  guildId: ticket.guildId ?? "",
  channelId: ticket.channelId ?? "",
  ownerId: ticket.ownerId ?? "",
  subject: ticket.subject ?? "Untitled ticket",
  reason: ticket.reason ?? "No details provided.",
  priority: ticket.priority ?? "Medium",
  status: ticket.status === "closed" ? "closed" : "open",
  participants: Array.isArray(ticket.participants)
    ? ticket.participants.filter((value): value is string => typeof value === "string")
    : [],
  createdAt: ticket.createdAt ?? new Date(0).toISOString(),
  claimedById: ticket.claimedById ?? null,
  closedAt: ticket.closedAt ?? null,
  closedById: ticket.closedById ?? null,
  closedReason: ticket.closedReason ?? null,
  transcriptFileName: ticket.transcriptFileName ?? null,
});

export class TicketStore {
  private readonly filePath: string;
  private data: TicketStoreData;

  constructor(filePath = resolve(process.cwd(), "data", "ticket-store.json")) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): TicketStoreData {
    mkdirSync(dirname(this.filePath), { recursive: true });

    if (!existsSync(this.filePath)) {
      const initialData = createDefaultStoreData();
      writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), "utf8");
      return initialData;
    }

    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as {
        guilds?: Record<string, Partial<GuildTicketState>>;
      };

      if (!raw.guilds || typeof raw.guilds !== "object") {
        return createDefaultStoreData();
      }

      const guilds = Object.fromEntries(
        Object.entries(raw.guilds).map(([guildId, guildState]) => [
          guildId,
          {
            config: {
              ...createDefaultConfig(),
              ...(guildState.config ?? {}),
            },
            nextTicketNumber:
              typeof guildState.nextTicketNumber === "number" &&
              guildState.nextTicketNumber > 0
                ? guildState.nextTicketNumber
                : 1,
            tickets: Array.isArray(guildState.tickets)
              ? guildState.tickets.map((ticket) => normaliseTicket(ticket))
              : [],
            stats: {
              totalOpened:
                typeof guildState.stats?.totalOpened === "number"
                  ? guildState.stats.totalOpened
                  : 0,
              totalClosed:
                typeof guildState.stats?.totalClosed === "number"
                  ? guildState.stats.totalClosed
                  : 0,
            },
          } satisfies GuildTicketState,
        ])
      );

      return { guilds };
    } catch {
      return createDefaultStoreData();
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  private ensureGuild(guildId: string): GuildTicketState {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = createDefaultGuildState();
      this.save();
    }

    return this.data.guilds[guildId];
  }

  getConfig(guildId: string): GuildTicketConfig {
    return { ...this.ensureGuild(guildId).config };
  }

  updateConfig(
    guildId: string,
    patch: Partial<GuildTicketConfig>
  ): GuildTicketConfig {
    const guildState = this.ensureGuild(guildId);

    guildState.config = {
      ...guildState.config,
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.staffRoleId !== undefined ? { staffRoleId: patch.staffRoleId } : {}),
      ...(patch.logChannelId !== undefined ? { logChannelId: patch.logChannelId } : {}),
      ...(patch.panelChannelId !== undefined
        ? { panelChannelId: patch.panelChannelId }
        : {}),
      maxOpenTicketsPerUser:
        patch.maxOpenTicketsPerUser ?? guildState.config.maxOpenTicketsPerUser,
    };

    this.save();
    return { ...guildState.config };
  }

  createTicket(input: CreateTicketInput): TicketRecord {
    const guildState = this.ensureGuild(input.guildId);
    const ticket: TicketRecord = {
      ticketNumber: guildState.nextTicketNumber,
      guildId: input.guildId,
      channelId: input.channelId,
      ownerId: input.ownerId,
      subject: input.subject,
      reason: input.reason,
      priority: input.priority,
      status: "open",
      participants: Array.from(
        new Set([input.ownerId, ...(input.participants ?? [])])
      ),
      createdAt: new Date().toISOString(),
      claimedById: null,
      closedAt: null,
      closedById: null,
      closedReason: null,
      transcriptFileName: null,
    };

    guildState.nextTicketNumber += 1;
    guildState.tickets.push(ticket);
    guildState.stats.totalOpened += 1;
    this.save();

    return { ...ticket };
  }

  getTicketByChannel(channelId: string): TicketRecord | null {
    for (const guildState of Object.values(this.data.guilds)) {
      const ticket = guildState.tickets.find((entry) => entry.channelId === channelId);
      if (ticket) {
        return { ...ticket };
      }
    }

    return null;
  }

  getOpenTicketByChannel(channelId: string): TicketRecord | null {
    const ticket = this.getTicketByChannel(channelId);
    if (!ticket || ticket.status !== "open") {
      return null;
    }

    return ticket;
  }

  getOpenTicketsByUser(guildId: string, userId: string): TicketRecord[] {
    return this.ensureGuild(guildId).tickets
      .filter((ticket) => ticket.ownerId === userId && ticket.status === "open")
      .map((ticket) => ({ ...ticket }));
  }

  updateTicket(
    channelId: string,
    patch: Partial<Omit<TicketRecord, "ticketNumber" | "guildId" | "channelId">>
  ): TicketRecord | null {
    for (const guildState of Object.values(this.data.guilds)) {
      const ticket = guildState.tickets.find((entry) => entry.channelId === channelId);

      if (!ticket) {
        continue;
      }

      Object.assign(ticket, patch);
      this.save();
      return { ...ticket };
    }

    return null;
  }

  claimTicket(channelId: string, staffId: string): TicketRecord | null {
    return this.updateTicket(channelId, { claimedById: staffId });
  }

  addParticipant(channelId: string, userId: string): TicketRecord | null {
    for (const guildState of Object.values(this.data.guilds)) {
      const ticket = guildState.tickets.find((entry) => entry.channelId === channelId);

      if (!ticket) {
        continue;
      }

      if (!ticket.participants.includes(userId)) {
        ticket.participants.push(userId);
        this.save();
      }

      return { ...ticket };
    }

    return null;
  }

  removeParticipant(channelId: string, userId: string): TicketRecord | null {
    for (const guildState of Object.values(this.data.guilds)) {
      const ticket = guildState.tickets.find((entry) => entry.channelId === channelId);

      if (!ticket) {
        continue;
      }

      ticket.participants = ticket.participants.filter((entry) => entry !== userId);
      this.save();
      return { ...ticket };
    }

    return null;
  }

  closeTicket(channelId: string, input: CloseTicketInput): TicketRecord | null {
    for (const guildState of Object.values(this.data.guilds)) {
      const ticket = guildState.tickets.find((entry) => entry.channelId === channelId);

      if (!ticket || ticket.status === "closed") {
        continue;
      }

      ticket.status = "closed";
      ticket.closedAt = new Date().toISOString();
      ticket.closedById = input.closedById;
      ticket.closedReason = input.reason;
      ticket.transcriptFileName = input.transcriptFileName ?? null;

      guildState.stats.totalClosed += 1;
      this.save();

      return { ...ticket };
    }

    return null;
  }

  getStats(guildId: string): {
    openCount: number;
    totalOpened: number;
    totalClosed: number;
  } {
    const guildState = this.ensureGuild(guildId);

    return {
      openCount: guildState.tickets.filter((ticket) => ticket.status === "open").length,
      totalOpened: guildState.stats.totalOpened,
      totalClosed: guildState.stats.totalClosed,
    };
  }
}
