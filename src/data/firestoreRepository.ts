import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {dbClient} from '../firebase';
import {findMentionedMembers} from '../mentions';
import type {
  Activity,
  BoardStatus,
  Channel,
  CurrentUser,
  Discussion,
  DocumentVersion,
  Invitation,
  KnowledgeDocument,
  Member,
  Notification,
  Reply,
  Role,
  Workspace,
} from '../types';
import {
  initials,
  limits,
  normalizeChannelName,
  normalizeEmail,
  normalizeTags,
  optionalText,
  requireText,
  validateDiscussion,
  validateDocument,
  validateEmail,
  validateReply,
  ValidationError,
} from '../validation';

const MAX_CHANNEL_DISCUSSIONS = 250;
const MAX_CHANNEL_REPLIES = 1500;
const MAX_CHANNEL_REACTIONS = 3000;
const MAX_CHANNEL_DOCUMENTS = 250;
const MAX_ACTIVITY = 100;
const MAX_NOTIFICATIONS = 150;
const INVITE_DAYS = 7;

type ReactionRecord = {
  id: string;
  workspaceId: string;
  channelId: string;
  targetType: 'discussion' | 'reply';
  targetId: string;
  userId: string;
  userEmail: string;
};

type BookmarkRecord = {
  id: string;
  workspaceId: string;
  channelId: string;
  threadId: string;
  userId: string;
  userEmail: string;
};

type WorkspaceSubscription = {
  unsubscribe: () => void;
  role: Role;
};

function db() {
  const client = dbClient();
  if (!client) throw new Error('Firebase is not configured.');
  return client;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as {toDate?: unknown}).toDate === 'function') {
    return ((value as {toDate: () => Date}).toDate()).toISOString();
  }
  return nowIso();
}

function dataOf(snapshot: QueryDocumentSnapshot<DocumentData>): DocumentData {
  return snapshot.data({serverTimestamps: 'estimate'});
}

function uniqueEmails(values: string[]): string[] {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function membershipId(workspaceId: string, userId: string): string {
  return `${workspaceId}_${userId}`;
}

function reactionId(targetType: ReactionRecord['targetType'], targetId: string, userId: string): string {
  return `${targetType}_${targetId}_${userId}`;
}

function bookmarkId(workspaceId: string, threadId: string, userId: string): string {
  return `${workspaceId}_${threadId}_${userId}`;
}

function mapMember(snapshot: QueryDocumentSnapshot<DocumentData>): Member {
  const value = dataOf(snapshot);
  return {
    id: String(value.userId || snapshot.id),
    name: String(value.name || value.email || 'Unknown member'),
    email: normalizeEmail(String(value.email || '')),
    initials: String(value.initials || initials(String(value.name || value.email || 'Threadline'))),
    role: value.role as Role,
    title: value.title ? String(value.title) : undefined,
    avatar: value.avatar ? String(value.avatar) : undefined,
    joinedAt: toIso(value.joinedAt),
    status: value.status === 'removed' ? 'removed' : 'active',
    inviteId: value.inviteId ? String(value.inviteId) : undefined,
  };
}

function mapChannel(snapshot: QueryDocumentSnapshot<DocumentData>): Channel {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    name: String(value.name || 'channel'),
    description: String(value.description || ''),
    private: Boolean(value.private),
    memberIds: Array.isArray(value.memberIds) ? value.memberIds.map(String) : [],
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
    createdById: value.createdById ? String(value.createdById) : undefined,
  };
}

function mapDiscussion(snapshot: QueryDocumentSnapshot<DocumentData>): Discussion {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    channelId: String(value.channelId || ''),
    title: String(value.title || 'Untitled discussion'),
    body: String(value.body || ''),
    authorId: String(value.authorId || ''),
    authorName: String(value.authorName || 'Unknown member'),
    authorEmail: normalizeEmail(String(value.authorEmail || '')),
    initials: String(value.initials || 'TL'),
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
    tags: Array.isArray(value.tags) ? value.tags.map(String) : [],
    replies: [],
    reactions: [],
    savedBy: [],
    status: value.status || 'open',
    boardStatus: value.boardStatus || 'backlog',
    resolution: value.resolution ? String(value.resolution) : undefined,
    resolvedBy: value.resolvedBy ? String(value.resolvedBy) : undefined,
    resolvedById: value.resolvedById ? String(value.resolvedById) : undefined,
    resolvedAt: value.resolvedAt ? toIso(value.resolvedAt) : undefined,
    acceptedReplyId: value.acceptedReplyId ? String(value.acceptedReplyId) : undefined,
    relatedDocumentIds: Array.isArray(value.relatedDocumentIds) ? value.relatedDocumentIds.map(String) : [],
    views: Number(value.views || 0),
  };
}

function mapReply(snapshot: QueryDocumentSnapshot<DocumentData>): Reply {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    channelId: String(value.channelId || ''),
    threadId: String(value.threadId || ''),
    authorId: String(value.authorId || ''),
    authorName: String(value.authorName || 'Unknown member'),
    authorEmail: normalizeEmail(String(value.authorEmail || '')),
    initials: String(value.initials || 'TL'),
    body: String(value.body || ''),
    createdAt: toIso(value.createdAt),
    updatedAt: value.updatedAt ? toIso(value.updatedAt) : undefined,
    reactions: [],
  };
}

function mapDocument(snapshot: QueryDocumentSnapshot<DocumentData>): KnowledgeDocument {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    title: String(value.title || 'Untitled document'),
    content: String(value.content || ''),
    channelId: String(value.channelId || ''),
    tags: Array.isArray(value.tags) ? value.tags.map(String) : [],
    authorId: String(value.authorId || ''),
    authorName: String(value.authorName || 'Unknown member'),
    authorEmail: normalizeEmail(String(value.authorEmail || '')),
    lastEditorId: String(value.lastEditorId || value.authorId || ''),
    lastEditorName: String(value.lastEditorName || value.authorName || 'Unknown member'),
    lastEditorEmail: normalizeEmail(String(value.lastEditorEmail || value.authorEmail || '')),
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
    versionCount: Number(value.versionCount || 0),
    versions: [],
    relatedThreadIds: Array.isArray(value.relatedThreadIds) ? value.relatedThreadIds.map(String) : [],
  };
}

function mapActivity(snapshot: QueryDocumentSnapshot<DocumentData>): Activity {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    type: value.type || 'workspace',
    summary: String(value.summary || 'Workspace activity'),
    actorId: value.actorId ? String(value.actorId) : undefined,
    actorName: String(value.actorName || 'Threadline'),
    createdAt: toIso(value.createdAt),
    targetId: value.targetId ? String(value.targetId) : undefined,
  };
}

function mapNotification(snapshot: QueryDocumentSnapshot<DocumentData>): Notification {
  const value = dataOf(snapshot);
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    recipientId: String(value.recipientId || ''),
    recipientEmail: normalizeEmail(String(value.recipientEmail || '')),
    text: String(value.text || 'Workspace update'),
    createdAt: toIso(value.createdAt),
    read: Boolean(value.read),
    type: value.type,
    targetThreadId: value.targetThreadId ? String(value.targetThreadId) : undefined,
    targetDocumentId: value.targetDocumentId ? String(value.targetDocumentId) : undefined,
  };
}

function mapInvitation(snapshot: QueryDocumentSnapshot<DocumentData>): Invitation {
  const value = dataOf(snapshot);
  const expiresAt = toIso(value.expiresAt);
  const expired = new Date(expiresAt).getTime() <= Date.now() && value.status === 'pending';
  return {
    id: snapshot.id,
    workspaceId: String(value.workspaceId || ''),
    workspaceName: String(value.workspaceName || 'Workspace'),
    email: normalizeEmail(String(value.email || '')),
    role: value.role as Invitation['role'],
    status: expired ? 'expired' : value.status,
    createdAt: toIso(value.createdAt),
    expiresAt,
    createdById: String(value.createdById || ''),
    createdByName: String(value.createdByName || 'Workspace admin'),
    acceptedById: value.acceptedById ? String(value.acceptedById) : undefined,
    respondedAt: value.respondedAt ? toIso(value.respondedAt) : undefined,
  };
}

function makeActivity(workspaceId: string, user: CurrentUser, type: Activity['type'], summary: string, targetId?: string) {
  return {
    workspaceId,
    type,
    summary,
    actorId: user.id,
    actorName: user.name,
    createdAt: serverTimestamp(),
    ...(targetId ? {targetId} : {}),
  };
}

function notificationPayload(workspaceId: string, recipient: Member, actor: CurrentUser, text: string, type: Notification['type'], target?: {threadId?: string; documentId?: string}) {
  return {
    workspaceId,
    recipientId: recipient.id,
    recipientEmail: normalizeEmail(recipient.email),
    actorId: actor.id,
    text,
    type,
    read: false,
    createdAt: serverTimestamp(),
    ...(target?.threadId ? {targetThreadId: target.threadId} : {}),
    ...(target?.documentId ? {targetDocumentId: target.documentId} : {}),
  };
}

export function watchWorkspaces(user: CurrentUser, onData: (workspaces: Workspace[]) => void, onError: (error: Error) => void): Unsubscribe {
  const client = db();
  const workspaceValues = new Map<string, Workspace>();
  const subscriptions = new Map<string, WorkspaceSubscription>();
  const membershipRoles = new Map<string, Role>();
  const emit = () => onData([...workspaceValues.values()].sort((a, b) => a.name.localeCompare(b.name)));

  const memberships = query(
    collection(client, 'memberships'),
    where('userId', '==', user.id),
    where('status', '==', 'active'),
  );

  const rootUnsubscribe = onSnapshot(memberships, snapshot => {
    const active = new Set<string>();
    for (const memberSnapshot of snapshot.docs) {
      const membership = mapMember(memberSnapshot);
      const value = dataOf(memberSnapshot);
      const workspaceId = String(value.workspaceId || '');
      if (!workspaceId) continue;
      active.add(workspaceId);
      const previousRole = membershipRoles.get(workspaceId);
      if (!subscriptions.has(workspaceId) || previousRole !== membership.role) {
        subscriptions.get(workspaceId)?.unsubscribe();
        membershipRoles.set(workspaceId, membership.role);
        const unsubscribe = watchWorkspace(workspaceId, user, membership, workspace => {
          workspaceValues.set(workspaceId, workspace);
          emit();
        }, error => {
          workspaceValues.delete(workspaceId);
          emit();
          onError(error);
        });
        subscriptions.set(workspaceId, {unsubscribe, role: membership.role});
      }
    }

    for (const [workspaceId, subscription] of subscriptions) {
      if (!active.has(workspaceId)) {
        subscription.unsubscribe();
        subscriptions.delete(workspaceId);
        membershipRoles.delete(workspaceId);
        workspaceValues.delete(workspaceId);
      }
    }
    emit();
  }, error => onError(error));

  return () => {
    rootUnsubscribe();
    for (const subscription of subscriptions.values()) subscription.unsubscribe();
  };
}

function watchWorkspace(workspaceId: string, user: CurrentUser, ownMembership: Member, onData: (workspace: Workspace) => void, onError: (error: Error) => void): Unsubscribe {
  const client = db();
  let meta: DocumentData | null = null;
  let members: Member[] = [];
  let channels: Channel[] = [];
  let activity: Activity[] = [];
  let notifications: Notification[] = [];
  let bookmarks: BookmarkRecord[] = [];

  const channelData = new Map<string, {threads: Discussion[]; replies: Reply[]; reactions: ReactionRecord[]; documents: KnowledgeDocument[]}>();
  const channelUnsubscribers = new Map<string, () => void>();
  const unsubscribers: (() => void)[] = [];

  const emit = () => {
    if (!meta) return;
    const allThreads = [...channelData.values()].flatMap(value => value.threads);
    const allReplies = [...channelData.values()].flatMap(value => value.replies);
    const allReactions = [...channelData.values()].flatMap(value => value.reactions);
    const allDocuments = [...channelData.values()].flatMap(value => value.documents);
    const reactionsByTarget = new Map<string, string[]>();
    for (const reaction of allReactions) {
      const key = `${reaction.targetType}:${reaction.targetId}`;
      reactionsByTarget.set(key, uniqueEmails([...(reactionsByTarget.get(key) || []), reaction.userEmail]));
    }
    const repliesByThread = new Map<string, Reply[]>();
    for (const reply of allReplies) {
      const next = {...reply, reactions: reactionsByTarget.get(`reply:${reply.id}`) || []};
      repliesByThread.set(reply.threadId || '', [...(repliesByThread.get(reply.threadId || '') || []), next]);
    }
    const bookmarked = new Set(bookmarks.map(item => item.threadId));
    const threads = allThreads.map(thread => ({
      ...thread,
      replies: (repliesByThread.get(thread.id) || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      reactions: reactionsByTarget.get(`discussion:${thread.id}`) || [],
      savedBy: bookmarked.has(thread.id) ? [normalizeEmail(user.email)] : [],
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    onData({
      id: workspaceId,
      name: String(meta.name || 'Workspace'),
      description: String(meta.description || ''),
      ownerId: String(meta.ownerId || ''),
      ownerEmail: normalizeEmail(String(meta.ownerEmail || '')),
      members: members.slice().sort((a, b) => a.name.localeCompare(b.name)),
      channels: channels.slice().sort((a, b) => a.name.localeCompare(b.name)),
      threads,
      documents: allDocuments.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      activity: activity.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      notifications: notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      createdAt: toIso(meta.createdAt),
      updatedAt: toIso(meta.updatedAt),
    });
  };

  const setChannels = (nextChannels: Channel[]) => {
    channels = nextChannels;
    const nextIds = new Set(channels.map(channel => channel.id));
    for (const [channelId, unsubscribe] of channelUnsubscribers) {
      if (!nextIds.has(channelId)) {
        unsubscribe();
        channelUnsubscribers.delete(channelId);
        channelData.delete(channelId);
      }
    }
    for (const channel of channels) {
      if (channelUnsubscribers.has(channel.id)) continue;
      channelData.set(channel.id, {threads: [], replies: [], reactions: [], documents: []});
      channelUnsubscribers.set(channel.id, watchChannelCollections(workspaceId, channel.id, value => {
        channelData.set(channel.id, value);
        emit();
      }, onError));
    }
    emit();
  };

  unsubscribers.push(onSnapshot(doc(client, 'workspaces', workspaceId), snapshot => {
    if (!snapshot.exists()) {
      onError(new Error('Workspace no longer exists or is unavailable.'));
      return;
    }
    meta = snapshot.data({serverTimestamps: 'estimate'});
    emit();
  }, onError));

  unsubscribers.push(onSnapshot(query(collection(client, 'memberships'), where('workspaceId', '==', workspaceId), where('status', '==', 'active')), snapshot => {
    members = snapshot.docs.map(mapMember);
    emit();
  }, onError));

  const channelCollection = collection(client, 'workspaces', workspaceId, 'channels');
  if (ownMembership.role === 'owner' || ownMembership.role === 'admin') {
    unsubscribers.push(onSnapshot(channelCollection, snapshot => setChannels(snapshot.docs.map(mapChannel)), onError));
  } else {
    let publicChannels: Channel[] = [];
    let privateChannels: Channel[] = [];
    const merge = () => setChannels([...publicChannels, ...privateChannels.filter(privateChannel => !publicChannels.some(publicChannel => publicChannel.id === privateChannel.id))]);
    unsubscribers.push(onSnapshot(query(channelCollection, where('private', '==', false)), snapshot => { publicChannels = snapshot.docs.map(mapChannel); merge(); }, onError));
    unsubscribers.push(onSnapshot(query(channelCollection, where('memberIds', 'array-contains', user.id)), snapshot => { privateChannels = snapshot.docs.map(mapChannel); merge(); }, onError));
  }

  unsubscribers.push(onSnapshot(query(collection(client, 'bookmarks'), where('workspaceId', '==', workspaceId), where('userId', '==', user.id)), snapshot => {
    bookmarks = snapshot.docs.map(item => ({id: item.id, ...dataOf(item)} as BookmarkRecord));
    emit();
  }, onError));

  unsubscribers.push(onSnapshot(query(collection(client, 'activity'), where('workspaceId', '==', workspaceId), limit(MAX_ACTIVITY)), snapshot => {
    activity = snapshot.docs.map(mapActivity);
    emit();
  }, onError));

  unsubscribers.push(onSnapshot(query(collection(client, 'notifications'), where('workspaceId', '==', workspaceId), where('recipientId', '==', user.id), limit(MAX_NOTIFICATIONS)), snapshot => {
    notifications = snapshot.docs.map(mapNotification);
    emit();
  }, onError));

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
    for (const unsubscribe of channelUnsubscribers.values()) unsubscribe();
  };
}

function watchChannelCollections(workspaceId: string, channelId: string, onData: (value: {threads: Discussion[]; replies: Reply[]; reactions: ReactionRecord[]; documents: KnowledgeDocument[]}) => void, onError: (error: Error) => void): Unsubscribe {
  const client = db();
  const state = {threads: [] as Discussion[], replies: [] as Reply[], reactions: [] as ReactionRecord[], documents: [] as KnowledgeDocument[]};
  const emit = () => onData({...state});
  const filters = [where('workspaceId', '==', workspaceId), where('channelId', '==', channelId)];
  const unsubscribers = [
    onSnapshot(query(collection(client, 'discussions'), ...filters, limit(MAX_CHANNEL_DISCUSSIONS)), snapshot => { state.threads = snapshot.docs.map(mapDiscussion); emit(); }, onError),
    onSnapshot(query(collection(client, 'replies'), ...filters, limit(MAX_CHANNEL_REPLIES)), snapshot => { state.replies = snapshot.docs.map(mapReply); emit(); }, onError),
    onSnapshot(query(collection(client, 'reactions'), ...filters, limit(MAX_CHANNEL_REACTIONS)), snapshot => {
      state.reactions = snapshot.docs.map(item => ({id: item.id, ...dataOf(item)} as ReactionRecord));
      emit();
    }, onError),
    onSnapshot(query(collection(client, 'documents'), ...filters, limit(MAX_CHANNEL_DOCUMENTS)), snapshot => { state.documents = snapshot.docs.map(mapDocument); emit(); }, onError),
  ];
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export function watchInvitations(email: string, onData: (invitations: Invitation[]) => void, onError: (error: Error) => void): Unsubscribe {
  const client = db();
  const normalized = validateEmail(email);
  return onSnapshot(query(collection(client, 'invitations'), where('email', '==', normalized), where('status', '==', 'pending'), limit(50)), snapshot => {
    onData(snapshot.docs.map(mapInvitation).filter(invitation => invitation.status === 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, onError);
}

export function watchDocumentVersions(documentId: string, onData: (versions: DocumentVersion[]) => void, onError: (error: Error) => void): Unsubscribe {
  const client = db();
  return onSnapshot(query(collection(client, 'documentVersions'), where('documentId', '==', documentId), limit(50)), snapshot => {
    const versions = snapshot.docs.map(item => {
      const value = dataOf(item);
      return {
        id: item.id,
        workspaceId: String(value.workspaceId || ''),
        channelId: String(value.channelId || ''),
        documentId: String(value.documentId || ''),
        title: String(value.title || 'Untitled document'),
        content: String(value.content || ''),
        editorId: String(value.editorId || ''),
        editorName: String(value.editorName || 'Unknown member'),
        editorEmail: normalizeEmail(String(value.editorEmail || '')),
        createdAt: toIso(value.createdAt),
      } satisfies DocumentVersion;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(versions);
  }, onError);
}

export async function createWorkspace(user: CurrentUser, name: string, description: string): Promise<string> {
  const client = db();
  const cleanName = requireText(name, 'Workspace name', limits.workspaceName, 2);
  const cleanDescription = optionalText(description, 'Workspace description', limits.workspaceDescription);
  const workspaceId = `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'workspace'}-${crypto.randomUUID().slice(0, 8)}`;
  const batch = writeBatch(client);
  const workspaceRef = doc(client, 'workspaces', workspaceId);
  const membershipRef = doc(client, 'memberships', membershipId(workspaceId, user.id));
  const channelRef = doc(client, 'workspaces', workspaceId, 'channels', 'general');
  const activityRef = doc(collection(client, 'activity'));
  batch.set(workspaceRef, {
    name: cleanName,
    description: cleanDescription,
    ownerId: user.id,
    ownerEmail: normalizeEmail(user.email),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 2,
  });
  batch.set(membershipRef, {
    workspaceId,
    userId: user.id,
    email: normalizeEmail(user.email),
    name: user.name,
    initials: user.initials,
    avatar: user.avatar || null,
    role: 'owner',
    status: 'active',
    joinedAt: serverTimestamp(),
  });
  batch.set(channelRef, {
    name: 'general',
    description: 'Workspace-wide discussion and shared context.',
    private: false,
    memberIds: [],
    createdById: user.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(activityRef, makeActivity(workspaceId, user, 'workspace', `Created ${cleanName}`));
  await batch.commit();
  return workspaceId;
}

export async function createInvitation(workspace: Workspace, actor: CurrentUser, email: string, role: Exclude<Role, 'owner'>): Promise<void> {
  const client = db();
  const normalized = validateEmail(email);
  if (workspace.members.some(member => normalizeEmail(member.email) === normalized)) throw new ValidationError('That person is already a workspace member.');
  const existing = await getDocs(query(collection(client, 'invitations'), where('workspaceId', '==', workspace.id), where('email', '==', normalized), where('status', '==', 'pending'), limit(1)));
  if (!existing.empty) throw new ValidationError('A pending invitation already exists for that email.');
  const invitationRef = doc(collection(client, 'invitations'));
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await setDoc(invitationRef, {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    email: normalized,
    role,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: expires,
    createdById: actor.id,
    createdByName: actor.name,
  });
}

export async function acceptInvitation(invitation: Invitation, user: CurrentUser): Promise<void> {
  const client = db();
  const invitationRef = doc(client, 'invitations', invitation.id);
  const membershipRef = doc(client, 'memberships', membershipId(invitation.workspaceId, user.id));
  const activityRef = doc(collection(client, 'activity'));
  await runTransaction(client, async transaction => {
    const invitationSnapshot = await transaction.get(invitationRef);
    if (!invitationSnapshot.exists()) throw new ValidationError('This invitation no longer exists.');
    const value = invitationSnapshot.data({serverTimestamps: 'estimate'});
    if (value.status !== 'pending') throw new ValidationError('This invitation has already been used or closed.');
    if (normalizeEmail(String(value.email || '')) !== normalizeEmail(user.email)) throw new ValidationError('This invitation belongs to a different account.');
    if (new Date(toIso(value.expiresAt)).getTime() <= Date.now()) throw new ValidationError('This invitation has expired. Ask a workspace admin to send another one.');
    transaction.set(membershipRef, {
      workspaceId: invitation.workspaceId,
      userId: user.id,
      email: normalizeEmail(user.email),
      name: user.name,
      initials: user.initials,
      avatar: user.avatar || null,
      role: value.role,
      status: 'active',
      inviteId: invitation.id,
      joinedAt: serverTimestamp(),
    });
    transaction.update(invitationRef, {status: 'accepted', acceptedById: user.id, respondedAt: serverTimestamp()});
    transaction.set(activityRef, makeActivity(invitation.workspaceId, user, 'member', `${user.name} joined the workspace`));
  });
}

export async function declineInvitation(invitation: Invitation, user: CurrentUser): Promise<void> {
  if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) throw new ValidationError('This invitation belongs to a different account.');
  await updateDoc(doc(db(), 'invitations', invitation.id), {status: 'declined', respondedAt: serverTimestamp()});
}

export async function createChannel(workspace: Workspace, actor: CurrentUser, input: {name: string; description: string; private: boolean; memberIds: string[]}): Promise<void> {
  const client = db();
  const name = normalizeChannelName(input.name);
  const description = optionalText(input.description, 'Channel description', limits.channelDescription);
  if (workspace.channels.some(channel => channel.name.toLowerCase() === name)) throw new ValidationError('A channel with that name already exists.');
  const channelId = `${name}-${crypto.randomUUID().slice(0, 6)}`;
  const memberIds = input.private ? [...new Set(input.memberIds.filter(id => workspace.members.some(member => member.id === id)))] : [];
  const batch = writeBatch(client);
  batch.set(doc(client, 'workspaces', workspace.id, 'channels', channelId), {
    name,
    description: description || 'Shared workspace discussion.',
    private: input.private,
    memberIds,
    createdById: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'channel', `Created #${name}`, channelId));
  await batch.commit();
}

export async function updateChannel(workspaceId: string, channel: Channel, actor: CurrentUser, input: {description: string; private: boolean; memberIds: string[]}): Promise<void> {
  const description = optionalText(input.description, 'Channel description', limits.channelDescription);
  await updateDoc(doc(db(), 'workspaces', workspaceId, 'channels', channel.id), {
    description,
    private: input.private,
    memberIds: input.private ? [...new Set(input.memberIds)] : [],
    updatedAt: serverTimestamp(),
    lastEditedById: actor.id,
  });
}

export async function updateMemberRole(workspaceId: string, member: Member, role: Exclude<Role, 'owner'>): Promise<void> {
  if (member.role === 'owner') throw new ValidationError('Workspace ownership cannot be changed from the member role control.');
  await updateDoc(doc(db(), 'memberships', membershipId(workspaceId, member.id)), {role});
}

export async function removeMember(workspaceId: string, member: Member): Promise<void> {
  if (member.role === 'owner') throw new ValidationError('The workspace owner cannot be removed.');
  await deleteDoc(doc(db(), 'memberships', membershipId(workspaceId, member.id)));
}

export async function createDiscussion(workspace: Workspace, actor: CurrentUser, input: {channelId: string; title: string; body: string; tags: string[]}): Promise<string> {
  const client = db();
  const {title, body} = validateDiscussion(input.title, input.body);
  const channel = workspace.channels.find(item => item.id === input.channelId);
  if (!channel) throw new ValidationError('Choose an available channel.');
  const threadId = crypto.randomUUID();
  const batch = writeBatch(client);
  batch.set(doc(client, 'discussions', threadId), {
    workspaceId: workspace.id,
    channelId: channel.id,
    title,
    body,
    authorId: actor.id,
    authorName: actor.name,
    authorEmail: normalizeEmail(actor.email),
    initials: actor.initials,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tags: normalizeTags(input.tags),
    status: 'open',
    boardStatus: 'backlog',
    relatedDocumentIds: [],
    views: 1,
  });
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'discussion', `Started “${title}”`, threadId));
  const mentions = findMentionedMembers(body, workspace.members).filter(member => member.id !== actor.id);
  for (const member of mentions.slice(0, 20)) {
    batch.set(doc(collection(client, 'notifications')), notificationPayload(workspace.id, member, actor, `${actor.name} mentioned you in “${title}”.`, 'mention', {threadId}));
  }
  await batch.commit();
  return threadId;
}

export async function editDiscussion(thread: Discussion, actor: CurrentUser, input: {title: string; body: string; tags: string[]}): Promise<void> {
  const {title, body} = validateDiscussion(input.title, input.body);
  await updateDoc(doc(db(), 'discussions', thread.id), {
    title,
    body,
    tags: normalizeTags(input.tags),
    updatedAt: serverTimestamp(),
    lastEditedById: actor.id,
  });
}

export async function deleteDiscussion(workspace: Workspace, thread: Discussion, actor: CurrentUser): Promise<void> {
  const client = db();
  const [replies, reactions, bookmarks] = await Promise.all([
    getDocs(query(collection(client, 'replies'), where('threadId', '==', thread.id), limit(300))),
    getDocs(query(collection(client, 'reactions'), where('workspaceId', '==', workspace.id), where('channelId', '==', thread.channelId), limit(MAX_CHANNEL_REACTIONS))),
    getDocs(query(collection(client, 'bookmarks'), where('workspaceId', '==', workspace.id), where('threadId', '==', thread.id), limit(300))),
  ]);
  const batch = writeBatch(client);
  batch.delete(doc(client, 'discussions', thread.id));
  replies.docs.forEach(item => batch.delete(item.ref));
  reactions.docs.filter(item => String(item.data().targetId || '') === thread.id || replies.docs.some(reply => reply.id === String(item.data().targetId || ''))).forEach(item => batch.delete(item.ref));
  bookmarks.docs.forEach(item => batch.delete(item.ref));
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'discussion', `Deleted “${thread.title}”`));
  await batch.commit();
}

export async function incrementDiscussionView(threadId: string): Promise<void> {
  await updateDoc(doc(db(), 'discussions', threadId), {views: increment(1)});
}

export async function moveDiscussion(threadId: string, status: BoardStatus, actor: CurrentUser, workspaceId: string, title: string): Promise<void> {
  const client = db();
  const batch = writeBatch(client);
  batch.update(doc(client, 'discussions', threadId), {boardStatus: status, updatedAt: serverTimestamp()});
  batch.set(doc(collection(client, 'activity')), makeActivity(workspaceId, actor, 'discussion', `Moved “${title}” to ${status}`, threadId));
  await batch.commit();
}

export async function toggleBookmark(workspaceId: string, thread: Discussion, user: CurrentUser): Promise<void> {
  const client = db();
  const ref = doc(client, 'bookmarks', bookmarkId(workspaceId, thread.id, user.id));
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) await deleteDoc(ref);
  else await setDoc(ref, {workspaceId, channelId: thread.channelId, threadId: thread.id, userId: user.id, userEmail: normalizeEmail(user.email), createdAt: serverTimestamp()});
}

export async function toggleReaction(workspaceId: string, channelId: string, targetType: ReactionRecord['targetType'], targetId: string, user: CurrentUser): Promise<void> {
  const client = db();
  const ref = doc(client, 'reactions', reactionId(targetType, targetId, user.id));
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) await deleteDoc(ref);
  else await setDoc(ref, {workspaceId, channelId, targetType, targetId, userId: user.id, userEmail: normalizeEmail(user.email), createdAt: serverTimestamp()});
}

export async function addReply(workspace: Workspace, thread: Discussion, actor: CurrentUser, rawBody: string): Promise<string> {
  const client = db();
  const body = validateReply(rawBody);
  const replyId = crypto.randomUUID();
  const batch = writeBatch(client);
  batch.set(doc(client, 'replies', replyId), {
    workspaceId: workspace.id,
    channelId: thread.channelId,
    threadId: thread.id,
    authorId: actor.id,
    authorName: actor.name,
    authorEmail: normalizeEmail(actor.email),
    initials: actor.initials,
    body,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(client, 'discussions', thread.id), {updatedAt: serverTimestamp()});
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'discussion', `Replied to “${thread.title}”`, thread.id));

  const recipients = new Map<string, Member>();
  const author = workspace.members.find(member => member.id === thread.authorId);
  if (author && author.id !== actor.id) recipients.set(author.id, author);
  for (const reply of thread.replies) {
    const member = workspace.members.find(item => item.id === reply.authorId);
    if (member && member.id !== actor.id) recipients.set(member.id, member);
  }
  for (const mentioned of findMentionedMembers(body, workspace.members)) {
    if (mentioned.id !== actor.id) recipients.set(mentioned.id, mentioned);
  }
  for (const member of [...recipients.values()].slice(0, 30)) {
    const mentioned = findMentionedMembers(body, [member]).length > 0;
    batch.set(doc(collection(client, 'notifications')), notificationPayload(workspace.id, member, actor, mentioned ? `${actor.name} mentioned you in “${thread.title}”.` : `${actor.name} replied to “${thread.title}”.`, mentioned ? 'mention' : 'reply', {threadId: thread.id}));
  }
  await batch.commit();
  return replyId;
}

export async function editReply(reply: Reply, actor: CurrentUser, body: string): Promise<void> {
  await updateDoc(doc(db(), 'replies', reply.id), {body: validateReply(body), updatedAt: serverTimestamp(), lastEditedById: actor.id});
}

export async function deleteReply(reply: Reply): Promise<void> {
  const client = db();
  const reactions = await getDocs(query(collection(client, 'reactions'), where('targetType', '==', 'reply'), where('targetId', '==', reply.id), limit(100)));
  const batch = writeBatch(client);
  batch.delete(doc(client, 'replies', reply.id));
  reactions.docs.forEach(item => batch.delete(item.ref));
  await batch.commit();
}

export async function setAcceptedReply(threadId: string, replyId: string | undefined): Promise<void> {
  await updateDoc(doc(db(), 'discussions', threadId), {acceptedReplyId: replyId || null, updatedAt: serverTimestamp()});
}

export async function resolveDiscussion(workspace: Workspace, thread: Discussion, actor: CurrentUser, rawResolution: string): Promise<void> {
  const client = db();
  const resolution = requireText(rawResolution, 'Resolution', 4_000);
  const batch = writeBatch(client);
  batch.update(doc(client, 'discussions', thread.id), {
    status: 'resolved',
    boardStatus: 'complete',
    resolution,
    resolvedBy: actor.name,
    resolvedById: actor.id,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'resolution', `Resolved “${thread.title}”`, thread.id));
  const recipientIds = new Set([thread.authorId, ...thread.replies.map(reply => reply.authorId)]);
  for (const member of workspace.members.filter(member => recipientIds.has(member.id) && member.id !== actor.id).slice(0, 30)) {
    batch.set(doc(collection(client, 'notifications')), notificationPayload(workspace.id, member, actor, `${actor.name} resolved “${thread.title}”.`, 'resolution', {threadId: thread.id}));
  }
  await batch.commit();
}

export async function saveDocument(workspace: Workspace, actor: CurrentUser, draft: KnowledgeDocument): Promise<string> {
  const client = db();
  const {title, content} = validateDocument(draft.title, draft.content);
  const tags = normalizeTags(draft.tags);
  const channel = workspace.channels.find(item => item.id === draft.channelId);
  if (!channel) throw new ValidationError('Choose an available channel.');
  const documentId = draft.id || crypto.randomUUID();
  const documentRef = doc(client, 'documents', documentId);
  const activityRef = doc(collection(client, 'activity'));

  await runTransaction(client, async transaction => {
    const snapshot = await transaction.get(documentRef);
    const existing = snapshot.exists() ? snapshot.data({serverTimestamps: 'estimate'}) : null;
    const previousRelated = Array.isArray(existing?.relatedThreadIds) ? existing.relatedThreadIds.map(String) : [];
    const nextRelated = [...new Set(draft.relatedThreadIds.filter(id => workspace.threads.some(thread => thread.id === id)))];
    const contentChanged = Boolean(existing) && (String(existing?.title || '') !== title || String(existing?.content || '') !== content);
    let versionCount = Number(existing?.versionCount || 0);

    if (existing && contentChanged) {
      const versionRef = doc(collection(client, 'documentVersions'));
      transaction.set(versionRef, {
        workspaceId: workspace.id,
        channelId: String(existing.channelId || draft.channelId),
        documentId,
        title: String(existing.title || 'Untitled document'),
        content: String(existing.content || ''),
        editorId: String(existing.lastEditorId || existing.authorId || ''),
        editorName: String(existing.lastEditorName || existing.authorName || 'Unknown member'),
        editorEmail: normalizeEmail(String(existing.lastEditorEmail || existing.authorEmail || '')),
        createdAt: serverTimestamp(),
      });
      versionCount += 1;
    }

    transaction.set(documentRef, {
      workspaceId: workspace.id,
      title,
      content,
      channelId: channel.id,
      tags,
      authorId: existing ? existing.authorId : actor.id,
      authorName: existing ? existing.authorName : actor.name,
      authorEmail: existing ? existing.authorEmail : normalizeEmail(actor.email),
      lastEditorId: actor.id,
      lastEditorName: actor.name,
      lastEditorEmail: normalizeEmail(actor.email),
      createdAt: existing ? existing.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      versionCount,
      relatedThreadIds: nextRelated,
    });

    for (const threadId of nextRelated.filter(id => !previousRelated.includes(id))) {
      transaction.update(doc(client, 'discussions', threadId), {relatedDocumentIds: arrayUnion(documentId), updatedAt: serverTimestamp()});
    }
    for (const threadId of previousRelated.filter((id: string) => !nextRelated.includes(id))) {
      transaction.update(doc(client, 'discussions', threadId), {relatedDocumentIds: arrayRemove(documentId), updatedAt: serverTimestamp()});
    }
    transaction.set(activityRef, makeActivity(workspace.id, actor, 'document', `${existing ? 'Updated' : 'Created'} “${title}”`, documentId));
  });
  return documentId;
}

export async function restoreDocumentVersion(workspaceId: string, document: KnowledgeDocument, version: DocumentVersion, actor: CurrentUser): Promise<void> {
  const client = db();
  const documentRef = doc(client, 'documents', document.id);
  const versionRef = doc(client, 'documentVersions', version.id);
  const historyRef = doc(collection(client, 'documentVersions'));
  const activityRef = doc(collection(client, 'activity'));
  await runTransaction(client, async transaction => {
    const [documentSnapshot, versionSnapshot] = await Promise.all([transaction.get(documentRef), transaction.get(versionRef)]);
    if (!documentSnapshot.exists() || !versionSnapshot.exists()) throw new ValidationError('That document version is no longer available.');
    const current = documentSnapshot.data({serverTimestamps: 'estimate'});
    const previous = versionSnapshot.data({serverTimestamps: 'estimate'});
    transaction.set(historyRef, {
      workspaceId,
      channelId: String(current.channelId || document.channelId),
      documentId: document.id,
      title: String(current.title || document.title),
      content: String(current.content || document.content),
      editorId: String(current.lastEditorId || actor.id),
      editorName: String(current.lastEditorName || actor.name),
      editorEmail: normalizeEmail(String(current.lastEditorEmail || actor.email)),
      createdAt: serverTimestamp(),
    });
    transaction.update(documentRef, {
      title: String(previous.title || document.title),
      content: String(previous.content || document.content),
      lastEditorId: actor.id,
      lastEditorName: actor.name,
      lastEditorEmail: normalizeEmail(actor.email),
      updatedAt: serverTimestamp(),
      versionCount: Number(current.versionCount || 0) + 1,
    });
    transaction.set(activityRef, makeActivity(workspaceId, actor, 'document', `Restored an earlier version of “${document.title}”`, document.id));
  });
}

export async function deleteDocument(workspace: Workspace, document: KnowledgeDocument, actor: CurrentUser): Promise<void> {
  const client = db();
  const versions = await getDocs(query(collection(client, 'documentVersions'), where('documentId', '==', document.id), limit(100)));
  const batch = writeBatch(client);
  batch.delete(doc(client, 'documents', document.id));
  versions.docs.forEach(item => batch.delete(item.ref));
  document.relatedThreadIds.forEach(threadId => batch.update(doc(client, 'discussions', threadId), {relatedDocumentIds: arrayRemove(document.id), updatedAt: serverTimestamp()}));
  batch.set(doc(collection(client, 'activity')), makeActivity(workspace.id, actor, 'document', `Deleted “${document.title}”`));
  await batch.commit();
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db(), 'notifications', id), {read: true});
}

export async function markAllNotificationsRead(workspaceId: string, userId: string): Promise<void> {
  const client = db();
  const snapshot = await getDocs(query(collection(client, 'notifications'), where('workspaceId', '==', workspaceId), where('recipientId', '==', userId), limit(MAX_NOTIFICATIONS)));
  const unread = snapshot.docs.filter(item => !item.data().read);
  if (!unread.length) return;
  const batch = writeBatch(client);
  unread.forEach(item => batch.update(item.ref, {read: true}));
  await batch.commit();
}

export function repositoryErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  const code = typeof error === 'object' && error && 'code' in error ? String((error as {code?: unknown}).code) : '';
  const known: Record<string, string> = {
    'permission-denied': 'You do not have permission to perform that action.',
    'unavailable': 'Threadline could not reach the collaboration service. Check your connection and try again.',
    'not-found': 'That item no longer exists or is no longer available to you.',
    'already-exists': 'That item already exists.',
    'failed-precondition': 'The workspace changed while you were working. Refresh the view and try again.',
    'resource-exhausted': 'That workspace action exceeded a service limit. Try a smaller change.',
  };
  return known[code] || (error instanceof Error && error.message ? error.message : 'The change could not be saved.');
}
