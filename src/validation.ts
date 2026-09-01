export const limits = {
  workspaceName: 80,
  workspaceDescription: 500,
  channelName: 60,
  channelDescription: 300,
  discussionTitle: 160,
  discussionBody: 12_000,
  replyBody: 6_000,
  documentTitle: 160,
  documentBody: 60_000,
  tag: 32,
  tags: 8,
} as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Enter a valid email address.');
  }
  return email;
}

export function requireText(value: string, label: string, max: number, min = 1): string {
  const text = value.trim();
  if (text.length < min) throw new ValidationError(`${label} must be at least ${min} character${min === 1 ? '' : 's'}.`);
  if (text.length > max) throw new ValidationError(`${label} must be ${max.toLocaleString()} characters or fewer.`);
  return text;
}

export function optionalText(value: string, label: string, max: number): string {
  const text = value.trim();
  if (text.length > max) throw new ValidationError(`${label} must be ${max.toLocaleString()} characters or fewer.`);
  return text;
}

export function normalizeChannelName(value: string): string {
  const text = requireText(value, 'Channel name', limits.channelName, 2).toLowerCase();
  const slug = text.replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  if (slug.length < 2) throw new ValidationError('Channel name must contain letters or numbers.');
  return slug.slice(0, limits.channelName);
}

export function normalizeTags(value: string | string[]): string[] {
  const source = Array.isArray(value) ? value : value.split(',');
  const tags = source
    .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
    .map(tag => tag.slice(0, limits.tag));
  return [...new Set(tags)].slice(0, limits.tags);
}

export function validateDiscussion(title: string, body: string): {title: string; body: string} {
  return {
    title: requireText(title, 'Discussion title', limits.discussionTitle, 3),
    body: requireText(body, 'Discussion context', limits.discussionBody),
  };
}

export function validateReply(body: string): string {
  return requireText(body, 'Reply', limits.replyBody);
}

export function validateDocument(title: string, content: string): {title: string; content: string} {
  return {
    title: requireText(title, 'Document title', limits.documentTitle, 3),
    content: requireText(content, 'Document content', limits.documentBody),
  };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'TL';
}
