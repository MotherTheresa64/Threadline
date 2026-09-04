import type {View} from './types';

export type AppRoute =
  | {kind: 'root'}
  | {kind: 'workspace'; workspaceId: string; view: Exclude<View, 'channel'>}
  | {kind: 'channel'; workspaceId: string; channelId: string}
  | {kind: 'discussion'; workspaceId: string; discussionId: string}
  | {kind: 'document'; workspaceId: string; documentId: string}
  | {kind: 'unknown'};

const viewSegments: Partial<Record<string, Exclude<View, 'channel'>>> = {
  home: 'home',
  knowledge: 'documents',
  board: 'board',
  timeline: 'timeline',
  saved: 'saved',
  inbox: 'notifications',
  search: 'search',
};

const segmentForView: Record<Exclude<View, 'channel'>, string> = {
  home: 'home',
  documents: 'knowledge',
  board: 'board',
  timeline: 'timeline',
  saved: 'saved',
  notifications: 'inbox',
  search: 'search',
};

export function parseRoute(pathname: string): AppRoute {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return {kind: 'root'};
  if (parts[0] !== 'w' || !parts[1]) return {kind: 'unknown'};
  const workspaceId = parts[1];
  if (parts.length === 2) return {kind: 'workspace', workspaceId, view: 'home'};
  if (parts[2] === 'channel' && parts[3] && parts.length === 4) return {kind: 'channel', workspaceId, channelId: parts[3]};
  if (parts[2] === 'discussion' && parts[3] && parts.length === 4) return {kind: 'discussion', workspaceId, discussionId: parts[3]};
  if (parts[2] === 'document' && parts[3] && parts.length === 4) return {kind: 'document', workspaceId, documentId: parts[3]};
  const view = viewSegments[parts[2]];
  if (view && parts.length === 3) return {kind: 'workspace', workspaceId, view};
  return {kind: 'unknown'};
}

export function routeForView(workspaceId: string, view: Exclude<View, 'channel'>): string {
  return `/w/${encodeURIComponent(workspaceId)}/${segmentForView[view]}`;
}

export function routeForChannel(workspaceId: string, channelId: string): string {
  return `/w/${encodeURIComponent(workspaceId)}/channel/${encodeURIComponent(channelId)}`;
}

export function routeForDiscussion(workspaceId: string, discussionId: string): string {
  return `/w/${encodeURIComponent(workspaceId)}/discussion/${encodeURIComponent(discussionId)}`;
}

export function routeForDocument(workspaceId: string, documentId: string): string {
  return `/w/${encodeURIComponent(workspaceId)}/document/${encodeURIComponent(documentId)}`;
}

export function pushRoute(path: string, replace = false): void {
  if (window.location.pathname === path) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', `${path}${window.location.search}`);
}
