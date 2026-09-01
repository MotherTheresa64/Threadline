import type {Channel, Discussion, KnowledgeDocument, Member, Role} from './types';

export const roleRank: Record<Role, number> = {
  guest: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function canWrite(role: Role): boolean {
  return roleRank[role] >= roleRank.member;
}

export function canManage(role: Role): boolean {
  return roleRank[role] >= roleRank.admin;
}

export function canAccessChannel(channel: Channel, member: Member | undefined): boolean {
  if (!member) return false;
  if (!channel.private) return true;
  return canManage(member.role) || channel.memberIds.includes(member.id);
}

export function canEditDiscussion(discussion: Discussion, member: Member | undefined): boolean {
  if (!member) return false;
  return canManage(member.role) || discussion.authorId === member.id;
}

export function canDeleteDiscussion(discussion: Discussion, member: Member | undefined): boolean {
  return canEditDiscussion(discussion, member);
}

export function canEditDocument(document: KnowledgeDocument, member: Member | undefined): boolean {
  if (!member) return false;
  return canWrite(member.role) && Boolean(document.id);
}

export function roleLabel(role: Role): string {
  if (role === 'guest') return 'Guest / viewer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
