export type Role='owner'|'admin'|'member'|'guest';
export type DiscussionStatus='open'|'discussion'|'resolved'|'archived';
export type BoardStatus='backlog'|'planned'|'active'|'review'|'complete';
export type View='home'|'channel'|'documents'|'board'|'timeline'|'saved'|'notifications'|'search';

export type Member={
  id:string;
  name:string;
  email:string;
  initials:string;
  role:Role;
  title?:string;
  avatar?:string;
  joinedAt:string;
};

export type Channel={
  id:string;
  name:string;
  description:string;
  private?:boolean;
  memberEmails?:string[];
  pinnedThreadIds?:string[];
  pinnedDocumentIds?:string[];
};

export type Reply={
  id:string;
  authorId:string;
  authorName:string;
  authorEmail:string;
  initials:string;
  body:string;
  createdAt:string;
  updatedAt?:string;
  reactions:string[];
};

export type Discussion={
  id:string;
  channelId:string;
  title:string;
  body:string;
  authorId:string;
  authorName:string;
  authorEmail:string;
  initials:string;
  createdAt:string;
  updatedAt:string;
  tags:string[];
  replies:Reply[];
  reactions:string[];
  savedBy:string[];
  status:DiscussionStatus;
  boardStatus:BoardStatus;
  resolution?:string;
  resolvedBy?:string;
  resolvedAt?:string;
  acceptedReplyId?:string;
  relatedDocumentIds:string[];
  views:number;
};

export type DocumentVersion={
  id:string;
  title:string;
  content:string;
  editorName:string;
  editorEmail:string;
  createdAt:string;
};

export type KnowledgeDocument={
  id:string;
  title:string;
  content:string;
  channelId?:string;
  tags:string[];
  authorName:string;
  authorEmail:string;
  lastEditorName:string;
  lastEditorEmail:string;
  createdAt:string;
  updatedAt:string;
  versions:DocumentVersion[];
  relatedThreadIds:string[];
};

export type Activity={
  id:string;
  type:'discussion'|'resolution'|'document'|'member'|'workspace';
  summary:string;
  actorName:string;
  createdAt:string;
  targetId?:string;
};

export type Notification={
  id:string;
  recipientEmail:string;
  text:string;
  createdAt:string;
  read:boolean;
  targetThreadId?:string;
  targetDocumentId?:string;
};

export type Workspace={
  id:string;
  name:string;
  description:string;
  ownerId:string;
  ownerEmail:string;
  memberEmails:string[];
  adminEmails:string[];
  guestEmails:string[];
  members:Member[];
  channels:Channel[];
  threads:Discussion[];
  documents:KnowledgeDocument[];
  activity:Activity[];
  notifications:Notification[];
  createdAt:string;
  updatedAt:string;
};

export type CurrentUser={
  id:string;
  name:string;
  email:string;
  initials:string;
  avatar?:string;
};
