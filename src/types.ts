export type Role = 'owner' | 'admin' | 'member' | 'guest';
export type DiscussionStatus = 'open' | 'discussion' | 'resolved' | 'archived';
export type BoardStatus = 'backlog' | 'planned' | 'active' | 'review' | 'complete';
export type View = 'home' | 'channel' | 'documents' | 'board' | 'timeline' | 'saved' | 'notifications' | 'search';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type Member = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  title?: string;
  avatar?: string;
  joinedAt: string;
  status?: 'active' | 'removed';
  inviteId?: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  private: boolean;
  memberIds: string[];
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
};

export type Reply = {
  id: string;
  workspaceId?: string;
  channelId?: string;
  threadId?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  initials: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  reactions: string[];
};

export type Discussion = {
  id: string;
  workspaceId?: string;
  channelId: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  replies: Reply[];
  reactions: string[];
  savedBy: string[];
  status: DiscussionStatus;
  boardStatus: BoardStatus;
  resolution?: string;
  resolvedBy?: string;
  resolvedById?: string;
  resolvedAt?: string;
  acceptedReplyId?: string;
  relatedDocumentIds: string[];
  views: number;
};

export type DocumentVersion = {
  id: string;
  workspaceId?: string;
  channelId?: string;
  documentId?: string;
  title: string;
  content: string;
  editorId: string;
  editorName: string;
  editorEmail: string;
  createdAt: string;
};

export type KnowledgeDocument = {
  id: string;
  workspaceId?: string;
  title: string;
  content: string;
  channelId: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  lastEditorId: string;
  lastEditorName: string;
  lastEditorEmail: string;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  versions: DocumentVersion[];
  relatedThreadIds: string[];
};

export type Activity = {
  id: string;
  workspaceId?: string;
  type: 'discussion' | 'resolution' | 'document' | 'member' | 'workspace' | 'channel';
  summary: string;
  actorId?: string;
  actorName: string;
  createdAt: string;
  targetId?: string;
};

export type Notification = {
  id: string;
  workspaceId?: string;
  recipientId?: string;
  recipientEmail: string;
  text: string;
  createdAt: string;
  read: boolean;
  type?: 'mention' | 'reply' | 'resolution' | 'membership' | 'document';
  targetThreadId?: string;
  targetDocumentId?: string;
};

export type Invitation = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  createdById: string;
  createdByName: string;
  acceptedById?: string;
  respondedAt?: string;
};

export type Workspace = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerEmail: string;
  members: Member[];
  channels: Channel[];
  threads: Discussion[];
  documents: KnowledgeDocument[];
  activity: Activity[];
  notifications: Notification[];
  createdAt: string;
  updatedAt: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatar?: string;
};

export type SearchResults = {
  threads: Discussion[];
  documents: KnowledgeDocument[];
};
