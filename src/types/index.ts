import {
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  Collection,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { TicketStore } from "../utils/ticketStore.js";
import { AutomodStore } from "../utils/automodStore.js";
import { LevelsStore } from "../utils/levelsStore.js";
import { WelcomeStore } from "../utils/welcomeStore.js";
import { AutoRoleStore } from "../utils/autoRoleStore.js";
import { ModerationStore } from "../utils/moderationStore.js";
import { VerificationStore } from "../utils/verificationStore.js";
import { GiveawayStore } from "../utils/giveawayStore.js";
import { GiveawayManager } from "../utils/giveawaySystem.js";
import { MusicManager } from "../utils/musicSystem.js";

export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent {
  name: keyof ClientEvents;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, BotCommand>;
  ticketStore: TicketStore;
  automodStore: AutomodStore;
  levelsStore: LevelsStore;
  welcomeStore: WelcomeStore;
  autoRoleStore: AutoRoleStore;
  moderationStore: ModerationStore;
  verificationStore: VerificationStore;
  giveawayStore: GiveawayStore;
  giveawayManager: GiveawayManager;
  musicManager: MusicManager;
}
