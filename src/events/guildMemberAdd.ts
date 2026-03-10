import { GuildMember } from "discord.js";
import { BotEvent } from "../types/index.js";
import { handleAutoRoleMember } from "../utils/autoRoleSystem.js";
import { handleWelcomeMember } from "../utils/welcomeSystem.js";

const event: BotEvent = {
  name: "guildMemberAdd",
  async execute(member: GuildMember) {
    await handleAutoRoleMember(member);
    await handleWelcomeMember(member);
  },
};

module.exports = event;
