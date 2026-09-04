import type {Member} from './types';

function mentionSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function memberMention(member: Member): string {
  return `@${mentionSlug(member.name)}`;
}

export function findMentionedMembers(body: string, members: Member[]): Member[] {
  const normalized = body.toLowerCase();
  const firstNameCounts = new Map<string, number>();
  for (const member of members) {
    const first = mentionSlug(member.name.split(/\s+/)[0] || '');
    if (first) firstNameCounts.set(first, (firstNameCounts.get(first) || 0) + 1);
  }

  const found = new Map<string, Member>();
  for (const member of members) {
    const full = mentionSlug(member.name);
    const first = mentionSlug(member.name.split(/\s+/)[0] || '');
    const hasFull = full && new RegExp(`(^|[^a-z0-9-])@${escapeRegExp(full)}(?=$|[^a-z0-9-])`, 'i').test(normalized);
    const hasUniqueFirst = first && firstNameCounts.get(first) === 1 && new RegExp(`(^|[^a-z0-9-])@${escapeRegExp(first)}(?=$|[^a-z0-9-])`, 'i').test(normalized);
    if (hasFull || hasUniqueFirst) found.set(member.id, member);
  }
  return [...found.values()];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
