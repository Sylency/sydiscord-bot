import { GuildMember, PermissionsBitField } from "discord.js";
import { ExtendedClient } from "../types/index.js";

export const handleAutoRoleMember = async (
  member: GuildMember
): Promise<void> => {
  const client = member.client as ExtendedClient;
  const config = client.autoRoleStore.getConfig(member.guild.id);
  if (!config.enabled || config.roleIds.length === 0) return;

  const botMember = member.guild.members.me;
  if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  const roles = config.roleIds
    .map((roleId) => member.guild.roles.cache.get(roleId))
    .filter((role): role is NonNullable<typeof role> => !!role);

  if (roles.length === 0) return;

  await member.roles.add(roles).catch(() => null);
};
