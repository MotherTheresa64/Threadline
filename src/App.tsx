import {useEffect, useMemo, useRef, useState} from 'react';
import {Bell, Bookmark, BookOpen, CheckCircle2, ChevronDown, Clock3, Hash, Home, Inbox, Kanban, LockKeyhole, LogIn, LogOut, MessageSquare, PanelLeft, PenLine, Search, Settings, X} from 'lucide-react';
import {authUserProfile, firebaseReady, signOutUser, watchAuth} from './firebase';
import {createDemoWorkspace} from './seed';
import type {Activity, BoardStatus, CurrentUser, Discussion, DocumentVersion, Invitation, KnowledgeDocument, Member, Notification, Reply, Role, View, Workspace} from './types';
import {canDeleteDiscussion, canEditDocument, canManage as roleCanManage, canWrite as roleCanWrite} from './permissions';
import {initials, normalizeEmail, normalizeTags, optionalText, requireText, validateDiscussion, validateDocument, validateReply, ValidationError} from './validation';
import {parseRoute, pushRoute, routeForChannel, routeForDiscussion, routeForDocument, routeForView} from './routing';
import * as cloud from './data/firestoreRepository';
import {BoardView, ChannelView, DocumentsView, EmptyAccount, HomeView, LoadingScreen, NavButton, NotificationsView, SearchView, ThreadCollection, TimelineView} from './components/Views';
import {DocumentDetail, ThreadDetail} from './components/Details';
import {DiscussionComposer, DocumentEditor, WorkspacePanel, WorkspaceSettings, type ChannelDraft, type DiscussionDraft} from './components/Dialogs';
import {AuthDialog} from './components/AuthDialog';

const LOCAL_KEY = 'threadline-demo-workspaces-v3';
const ACTIVE_KEY = 'threadline-active-workspace-v3';

const clone = <T,>(value: T): T => structuredClone(value);
const nowIso = () => new Date().toISOString();

function readLocalWorkspaces(): Workspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (Array.isArray(parsed) && parsed.length) return parsed as Workspace[];
  } catch {
    // Fall through to a known-good fictional demo.
  }
  return [createDemoWorkspace()];
}

function writeLocalWorkspaces(workspaces: Workspace[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(workspaces));
  } catch {
    // The in-memory demo remains usable when browser storage is unavailable.
  }
}

function roleFor(workspace: Workspace | undefined, user: CurrentUser, usingCloud: boolean): Role {
  if (!workspace) return 'guest';
  const member = workspace.members.find(item => item.id === user.id || normalizeEmail(item.email) === normalizeEmail(user.email));
  return member?.role ?? (usingCloud ? 'guest' : 'owner');
}

function localActivity(user: CurrentUser, type: Activity['type'], summary: string, targetId?: string): Activity {
  return {id: crypto.randomUUID(), type, summary, actorId: user.id, actorName: user.name, createdAt: nowIso(), targetId};
}

function localNotification(member: Member, text: string, type: Notification['type'], target?: {threadId?: string; documentId?: string}): Notification {
  return {id: crypto.randomUUID(), recipientId: member.id, recipientEmail: member.email, text, type, createdAt: nowIso(), read: false, targetThreadId: target?.threadId, targetDocumentId: target?.documentId};
}

export default function App() {
  const [localWorkspaces, setLocalWorkspaces] = useState<Workspace[]>(readLocalWorkspaces);
  const [cloudWorkspaces, setCloudWorkspaces] = useState<Workspace[]>([]);
  const [cloudUser, setCloudUser] = useState<CurrentUser | null>(null);
  const [authResolved, setAuthResolved] = useState(!firebaseReady);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || readLocalWorkspaces()[0]?.id || '');
  const [view, setView] = useState<View>('home');
  const [channelId, setChannelId] = useState('general');
  const [query, setQuery] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [documentEditor, setDocumentEditor] = useState<KnowledgeDocument | null | undefined>(undefined);
  const [workspacePanel, setWorkspacePanel] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [routeError, setRouteError] = useState<'signin' | 'unavailable' | 'unknown' | ''>('');
  const [locationTick, setLocationTick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const usingCloud = Boolean(firebaseReady && cloudUser);
  const workspaces = usingCloud ? cloudWorkspaces : localWorkspaces;
  const workspace = workspaces.find(item => item.id === activeId) ?? workspaces[0];
  const demoOwner = workspace?.members.find(member => member.role === 'owner') ?? workspace?.members[0];
  const currentUser: CurrentUser = cloudUser ?? {
    id: demoOwner?.id || 'demo-owner',
    name: demoOwner?.name || 'Jordan Blake',
    email: demoOwner?.email || 'jordan@northstar.example',
    initials: demoOwner?.initials || 'JB',
  };
  const currentMember = workspace?.members.find(member => member.id === currentUser.id || normalizeEmail(member.email) === normalizeEmail(currentUser.email));
  const currentRole = roleFor(workspace, currentUser, usingCloud);
  const canWrite = roleCanWrite(currentRole);
  const canManage = roleCanManage(currentRole);

  useEffect(() => watchAuth(user => {
    setAuthResolved(true);
    if (!user) {
      setCloudUser(null);
      setCloudWorkspaces([]);
      setInvitations([]);
      setCloudLoading(false);
      return;
    }
    const profile = authUserProfile(user);
    setCloudUser(profile);
    setCloudLoading(true);
  }), []);

  useEffect(() => {
    if (!cloudUser) return;
    setCloudLoading(true);
    return cloud.watchWorkspaces(cloudUser, items => {
      setCloudWorkspaces(items);
      setCloudLoading(false);
      setActiveId(previous => items.some(item => item.id === previous) ? previous : items[0]?.id || '');
    }, reason => {
      setCloudLoading(false);
      setToast(cloud.repositoryErrorMessage(reason));
    });
  }, [cloudUser?.id]);

  useEffect(() => {
    if (!cloudUser?.email) return;
    return cloud.watchInvitations(cloudUser.email, items => {
      setInvitations(items);
      if (items.length && cloudWorkspaces.length === 0) setWorkspacePanel(true);
    }, reason => setToast(cloud.repositoryErrorMessage(reason)));
  }, [cloudUser?.email, cloudWorkspaces.length]);

  useEffect(() => {
    if (!usingCloud) writeLocalWorkspaces(localWorkspaces);
  }, [localWorkspaces, usingCloud]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape' && mobileNav) setMobileNav(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileNav]);

  useEffect(() => {
    const pop = () => setLocationTick(value => value + 1);
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    if (!authResolved || (usingCloud && cloudLoading)) return;
    const route = parseRoute(window.location.pathname);
    if (route.kind === 'root') {
      setRouteError('');
      if (workspace) pushRoute(routeForView(workspace.id, 'home'), true);
      return;
    }
    if (route.kind === 'unknown') {
      setRouteError('unknown');
      return;
    }
    const target = workspaces.find(item => item.id === route.workspaceId);
    if (!target) {
      setRouteError(!cloudUser && firebaseReady && route.workspaceId !== 'northstar-demo' ? 'signin' : 'unavailable');
      return;
    }
    setRouteError('');
    if (activeId !== target.id) setActiveId(target.id);
    if (route.kind === 'channel') {
      setView('channel'); setChannelId(route.channelId); setSelectedThreadId(null); setSelectedDocumentId(null);
    } else if (route.kind === 'discussion') {
      setSelectedThreadId(route.discussionId); setSelectedDocumentId(null);
    } else if (route.kind === 'document') {
      setView('documents'); setSelectedDocumentId(route.documentId); setSelectedThreadId(null);
    } else {
      setView(route.view); setSelectedThreadId(null); setSelectedDocumentId(null);
    }
  }, [authResolved, cloudLoading, usingCloud, locationTick, workspaces.length, activeId]);

  useEffect(() => {
    if (!workspace || !workspace.channels.length) return;
    if (view === 'channel' && !workspace.channels.some(channel => channel.id === channelId)) {
      setView('home');
      setChannelId(workspace.channels[0].id);
      setToast('That channel is no longer available.');
      pushRoute(routeForView(workspace.id, 'home'), true);
    }
  }, [workspace?.id, workspace?.channels.length, channelId, view]);

  const activeThread = workspace?.threads.find(item => item.id === selectedThreadId);
  const activeDocument = workspace?.documents.find(item => item.id === selectedDocumentId);

  useEffect(() => {
    if (!activeDocument) {
      setDocumentVersions([]);
      setVersionsLoading(false);
      return;
    }
    if (!usingCloud) {
      setDocumentVersions(activeDocument.versions.slice().reverse());
      setVersionsLoading(false);
      return;
    }
    setVersionsLoading(true);
    return cloud.watchDocumentVersions(activeDocument.id, versions => {
      setDocumentVersions(versions);
      setVersionsLoading(false);
    }, reason => {
      setVersionsLoading(false);
      setToast(cloud.repositoryErrorMessage(reason));
    });
  }, [activeDocument?.id, usingCloud]);

  const commitLocal = (updater: (draft: Workspace) => Workspace, success?: string) => {
    if (!workspace) return;
    setLocalWorkspaces(items => items.map(item => item.id === workspace.id ? {...updater(clone(item)), updatedAt: nowIso()} : item));
    if (success) setToast(success);
  };

  const runCloud = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) setToast(success);
    } catch (reason) {
      setToast(cloud.repositoryErrorMessage(reason));
      throw reason;
    }
  };

  const chooseView = (next: Exclude<View, 'channel'>) => {
    if (!workspace) return;
    setView(next); setQuery(next === 'search' ? query : ''); setMobileNav(false); setSelectedThreadId(null); setSelectedDocumentId(null);
    pushRoute(routeForView(workspace.id, next));
  };

  const chooseChannel = (id: string) => {
    if (!workspace) return;
    setChannelId(id); setView('channel'); setQuery(''); setMobileNav(false); setSelectedThreadId(null); setSelectedDocumentId(null);
    pushRoute(routeForChannel(workspace.id, id));
  };

  const openThread = (id: string) => {
    if (!workspace) return;
    setSelectedThreadId(id); setSelectedDocumentId(null); setMobileNav(false);
    pushRoute(routeForDiscussion(workspace.id, id));
    if (usingCloud) void runCloud(() => cloud.incrementDiscussionView(id));
    else if (canWrite) commitLocal(draft => { const thread = draft.threads.find(item => item.id === id); if (thread) thread.views += 1; return draft; });
  };

  const openDocument = (id: string) => {
    if (!workspace) return;
    setSelectedDocumentId(id); setSelectedThreadId(null); setView('documents'); setMobileNav(false);
    pushRoute(routeForDocument(workspace.id, id));
  };

  const closeDetail = () => {
    if (!workspace) return;
    const thread = activeThread;
    setSelectedThreadId(null); setSelectedDocumentId(null);
    if (thread) {
      setView('channel'); setChannelId(thread.channelId); pushRoute(routeForChannel(workspace.id, thread.channelId));
    } else {
      setView('documents'); pushRoute(routeForView(workspace.id, 'documents'));
    }
  };

  const searchResults = useMemo(() => {
    if (!workspace || !query.trim()) return {threads: [] as Discussion[], documents: [] as KnowledgeDocument[]};
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return {
      threads: workspace.threads.filter(thread => {
        const channel = workspace.channels.find(item => item.id === thread.channelId)?.name || '';
        const replies = thread.replies.map(reply => `${reply.authorName} ${reply.body}`).join(' ');
        return `${thread.title} ${thread.body} ${thread.authorName} ${thread.tags.join(' ')} ${channel} ${thread.resolution || ''} ${replies}`.toLowerCase().includes(q);
      }),
      documents: workspace.documents.filter(document => `${document.title} ${document.content} ${document.tags.join(' ')} ${document.lastEditorName}`.toLowerCase().includes(q)),
    };
  }, [workspace, query]);

  const startWorkspace = async (name: string, description: string) => {
    try {
      const cleanName = requireText(name, 'Workspace name', 80, 2);
      const cleanDescription = optionalText(description, 'Workspace description', 500);
      if (usingCloud) {
        const id = await cloud.createWorkspace(currentUser, cleanName, cleanDescription);
        setActiveId(id); setWorkspacePanel(false); setView('home'); pushRoute(routeForView(id, 'home'));
        setToast('Workspace created');
        return;
      }
      const now = nowIso();
      const id = `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'workspace'}-${crypto.randomUUID().slice(0, 6)}`;
      const next: Workspace = {
        id, name: cleanName, description: cleanDescription, ownerId: currentUser.id, ownerEmail: currentUser.email,
        members: [{id: currentUser.id, name: currentUser.name, email: currentUser.email, initials: currentUser.initials, role: 'owner', joinedAt: now, status: 'active'}],
        channels: [{id: 'general', name: 'general', description: 'Workspace-wide discussion and shared context.', private: false, memberIds: []}],
        threads: [], documents: [], activity: [localActivity(currentUser, 'workspace', `Created ${cleanName}`)], notifications: [], createdAt: now, updatedAt: now,
      };
      setLocalWorkspaces(items => [...items, next]); setActiveId(id); setWorkspacePanel(false); setView('home'); pushRoute(routeForView(id, 'home')); setToast('Demo workspace created in this browser');
    } catch (reason) {
      const message = reason instanceof ValidationError ? reason.message : 'Workspace could not be created.';
      setToast(message);
      throw reason;
    }
  };

  const createDiscussion = async (draft: DiscussionDraft) => {
    if (!workspace) return;
    if (usingCloud) {
      let id = '';
      await runCloud(async () => { id = await cloud.createDiscussion(workspace, currentUser, draft); }, 'Discussion published');
      setComposerOpen(false); setView('channel'); setChannelId(draft.channelId); openThread(id);
      return;
    }
    try {
      const clean = validateDiscussion(draft.title, draft.body);
      const now = nowIso();
      const thread: Discussion = {id: crypto.randomUUID(), workspaceId: workspace.id, channelId: draft.channelId, title: clean.title, body: clean.body, authorId: currentUser.id, authorName: currentUser.name, authorEmail: currentUser.email, initials: currentUser.initials, createdAt: now, updatedAt: now, tags: normalizeTags(draft.tags), replies: [], reactions: [], savedBy: [], status: 'open', boardStatus: 'backlog', relatedDocumentIds: [], views: 1};
      commitLocal(value => { value.threads = [thread, ...value.threads]; value.activity.unshift(localActivity(currentUser, 'discussion', `Started “${thread.title}”`, thread.id)); return value; }, 'Demo discussion published locally');
      setComposerOpen(false); setView('channel'); setChannelId(thread.channelId); setSelectedThreadId(thread.id); pushRoute(routeForDiscussion(workspace.id, thread.id));
    } catch (reason) {
      setToast(reason instanceof ValidationError ? reason.message : 'Discussion could not be created.');
      throw reason;
    }
  };

  const saveDocument = async (document: KnowledgeDocument) => {
    if (!workspace) return;
    if (usingCloud) {
      let id = document.id;
      await runCloud(async () => { id = await cloud.saveDocument(workspace, currentUser, document); }, 'Document saved');
      setDocumentEditor(undefined); openDocument(id);
      return;
    }
    try {
      const clean = validateDocument(document.title, document.content);
      commitLocal(draft => {
        const existing = draft.documents.find(item => item.id === document.id);
        const previousRelations = existing?.relatedThreadIds || [];
        const nextRelations = document.relatedThreadIds;
        const next = {...document, title: clean.title, content: clean.content, tags: normalizeTags(document.tags), updatedAt: nowIso()};
        if (existing && (existing.title !== next.title || existing.content !== next.content)) {
          const version: DocumentVersion = {id: crypto.randomUUID(), workspaceId: draft.id, channelId: existing.channelId, documentId: existing.id, title: existing.title, content: existing.content, editorId: existing.lastEditorId, editorName: existing.lastEditorName, editorEmail: existing.lastEditorEmail, createdAt: existing.updatedAt};
          next.versions = [...existing.versions, version]; next.versionCount = existing.versionCount + 1;
        }
        for (const thread of draft.threads) {
          if (nextRelations.includes(thread.id) && !thread.relatedDocumentIds.includes(next.id)) thread.relatedDocumentIds.push(next.id);
          if (previousRelations.includes(thread.id) && !nextRelations.includes(thread.id)) thread.relatedDocumentIds = thread.relatedDocumentIds.filter(id => id !== next.id);
        }
        draft.documents = existing ? draft.documents.map(item => item.id === next.id ? next : item) : [next, ...draft.documents];
        draft.activity.unshift(localActivity(currentUser, 'document', `${existing ? 'Updated' : 'Created'} “${next.title}”`, next.id));
        return draft;
      }, 'Demo document saved locally');
      setDocumentEditor(undefined); openDocument(document.id);
    } catch (reason) {
      setToast(reason instanceof ValidationError ? reason.message : 'Document could not be saved.');
      throw reason;
    }
  };

  const unread = workspace?.notifications.filter(item => (item.recipientId === currentUser.id || normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email)) && !item.read).length ?? 0;
  const bookmarkedCount = workspace?.threads.filter(thread => thread.savedBy.includes(normalizeEmail(currentUser.email))).length ?? 0;

  if (!authResolved) return <LoadingScreen label="Checking authentication…" />;
  if (usingCloud && cloudLoading && cloudWorkspaces.length === 0) return <LoadingScreen />;

  if (routeError) return <div className="route-state"><span className="logo-mark">t</span><h1>{routeError === 'signin' ? 'Sign in to open this Threadline link' : routeError === 'unknown' ? 'This route does not exist' : 'This workspace item is unavailable'}</h1><p>{routeError === 'signin' ? 'The link points to a shared workspace. Threadline does not reveal whether private resources exist until you authenticate.' : routeError === 'unknown' ? 'The URL is not a valid Threadline destination.' : 'It may have been deleted, or your membership no longer grants access.'}</p><div className="modal-actions">{routeError === 'signin' && <button className="publish" onClick={() => setAuthOpen(true)}><LogIn />Sign in</button>}<button className="secondary-button" onClick={() => { setRouteError(''); const demo = localWorkspaces[0] || createDemoWorkspace(); setActiveId(demo.id); pushRoute(routeForView(demo.id, 'home')); }}>Open demo</button></div>{authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onMessage={setToast} />}</div>;

  if (!workspace) return <EmptyAccount user={cloudUser} onCreate={() => setWorkspacePanel(true)} onSignOut={() => void signOutUser()} panel={workspacePanel ? <WorkspacePanel workspaces={[]} activeId="" invitations={invitations} onChoose={() => {}} onClose={() => setWorkspacePanel(false)} onCreate={startWorkspace} onAcceptInvite={async invitation => { if (!cloudUser) return; await runCloud(() => cloud.acceptInvitation(invitation, cloudUser), 'Invitation accepted'); }} onDeclineInvite={async invitation => { if (!cloudUser) return; await runCloud(() => cloud.declineInvitation(invitation, cloudUser), 'Invitation declined'); }} /> : null} />;

  const missingDetail = (selectedThreadId && !activeThread) || (selectedDocumentId && !activeDocument);

  return <div className="shell app-shell">
    <aside className={mobileNav ? 'rail open' : 'rail'} aria-label="Workspace navigation">
      <div className="logo"><span>t</span>threadline</div>
      <button className="workspace" onClick={() => setWorkspacePanel(true)}><span className="avatar">{workspace.name.slice(0, 2).toUpperCase()}</span><span><b>{workspace.name}</b><small>{workspace.members.length} members · {usingCloud ? 'shared cloud' : 'browser-local demo'}</small></span><ChevronDown size={15} /></button>
      <nav className="primary-nav" aria-label="Primary">
        <NavButton active={view === 'home' && !selectedThreadId && !selectedDocumentId} icon={<Home />} label="Home" onClick={() => chooseView('home')} />
        <NavButton active={view === 'notifications'} icon={<Inbox />} label="Inbox" count={unread} onClick={() => chooseView('notifications')} />
        <NavButton active={view === 'saved'} icon={<Bookmark />} label="Saved" count={bookmarkedCount} onClick={() => chooseView('saved')} />
        <NavButton active={view === 'documents'} icon={<BookOpen />} label="Knowledge" count={workspace.documents.length} onClick={() => chooseView('documents')} />
        <NavButton active={view === 'board'} icon={<Kanban />} label="Board" onClick={() => chooseView('board')} />
        <NavButton active={view === 'timeline'} icon={<Clock3 />} label="Timeline" onClick={() => chooseView('timeline')} />
      </nav>
      <div className="nav-head">Channels {canManage && usingCloud && <button className="tiny-icon" onClick={() => setSettingsOpen(true)} aria-label="Manage channels"><Settings size={13} /></button>}</div>
      <div className="channels">{workspace.channels.map(channel => <button className={view === 'channel' && channelId === channel.id ? 'active' : ''} key={channel.id} onClick={() => chooseChannel(channel.id)}>{channel.private ? <LockKeyhole /> : <Hash />}{channel.name}<b>{workspace.threads.filter(thread => thread.channelId === channel.id && thread.status !== 'archived').length}</b></button>)}</div>
      <div className="people member-strip"><div className="nav-head">Members <span>{workspace.members.length}</span></div>{workspace.members.slice(0, 5).map(member => <div key={member.id}><span className="avatar">{member.initials}</span><span>{member.name}<small>{member.role}</small></span></div>)}</div>
      <div className="rail-bottom">
        <button className="settings" onClick={() => setSettingsOpen(true)}><Settings />Workspace settings</button>
        {firebaseReady ? <button className="settings" onClick={() => cloudUser ? void signOutUser() : setAuthOpen(true)}>{cloudUser ? <LogOut /> : <LogIn />}{cloudUser ? 'Sign out' : 'Sign in to collaborate'}</button> : <span className="demo-only-note">Firebase is not configured; demo mode only.</span>}
      </div>
    </aside>
    {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

    <main className="feed workspace-feed">
      <header><button className="mobile" onClick={() => setMobileNav(value => !value)} aria-label="Toggle workspace navigation"><PanelLeft /></button><div className="search"><Search /><input ref={searchRef} value={query} onChange={event => { const next = event.target.value; setQuery(next); if (next.trim()) { setView('search'); pushRoute(routeForView(workspace.id, 'search')); } }} placeholder="Search accessible knowledge…" aria-label="Search discussions, replies, resolutions, and documents" /><kbd>⌘ K</kbd></div><button className="bell" onClick={() => chooseView('notifications')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell />{unread > 0 && <i />}</button>{canWrite && <button className="new" onClick={() => setComposerOpen(true)}><PenLine />New discussion</button>}</header>

      {view === 'home' && <HomeView workspace={workspace} currentUser={currentUser} onOpenThread={openThread} onOpenDocument={openDocument} />}
      {view === 'channel' && <ChannelView workspace={workspace} channelId={channelId} onOpenThread={openThread} />}
      {view === 'saved' && <ThreadCollection title="Saved" description="Discussions you bookmarked for quick reference." threads={workspace.threads.filter(thread => thread.savedBy.includes(normalizeEmail(currentUser.email)))} workspace={workspace} onOpenThread={openThread} />}
      {view === 'documents' && <DocumentsView workspace={workspace} canWrite={canWrite} onOpen={openDocument} onCreate={() => setDocumentEditor(null)} />}
      {view === 'board' && <BoardView workspace={workspace} canWrite={canWrite} onOpen={openThread} onMove={(threadId, status) => {
        const thread = workspace.threads.find(item => item.id === threadId); if (!thread) return;
        if (usingCloud) void runCloud(() => cloud.moveDiscussion(threadId, status, currentUser, workspace.id, thread.title), 'Board updated');
        else commitLocal(draft => { const item = draft.threads.find(value => value.id === threadId); if (item) { item.boardStatus = status; item.updatedAt = nowIso(); draft.activity.unshift(localActivity(currentUser, 'discussion', `Moved “${item.title}” to ${status}`, item.id)); } return draft; }, 'Demo board updated locally');
      }} />}
      {view === 'timeline' && <TimelineView workspace={workspace} onOpenThread={openThread} onOpenDocument={openDocument} />}
      {view === 'notifications' && <NotificationsView notifications={workspace.notifications.filter(item => item.recipientId === currentUser.id || normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email))} onOpenThread={openThread} onOpenDocument={openDocument} onMarkRead={id => {
        if (usingCloud) void runCloud(() => cloud.markNotificationRead(id));
        else commitLocal(draft => { const item = draft.notifications.find(notification => notification.id === id); if (item) item.read = true; return draft; });
      }} onMarkAll={() => {
        if (usingCloud) void runCloud(() => cloud.markAllNotificationsRead(workspace.id, currentUser.id), 'Inbox cleared');
        else commitLocal(draft => { draft.notifications.forEach(item => { if (item.recipientId === currentUser.id || normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email)) item.read = true; }); return draft; }, 'Demo inbox cleared locally');
      }} />}
      {view === 'search' && <SearchView query={query} results={searchResults} workspace={workspace} onOpenThread={openThread} onOpenDocument={openDocument} />}
    </main>

    <aside className={(activeThread || activeDocument || missingDetail) ? 'detail detail-open' : 'detail'} aria-label="Content details">
      <button className="detail-close" onClick={closeDetail} aria-label="Close details"><X /></button>
      {activeThread && <ThreadDetail thread={activeThread} workspace={workspace} currentUser={currentUser} canWrite={canWrite} canManage={canManage} onToggleBookmark={async () => {
        if (usingCloud) await runCloud(() => cloud.toggleBookmark(workspace.id, activeThread, currentUser));
        else commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) { const email = normalizeEmail(currentUser.email); thread.savedBy = thread.savedBy.includes(email) ? thread.savedBy.filter(value => value !== email) : [...thread.savedBy, email]; } return draft; });
      }} onToggleThreadReaction={async () => {
        if (usingCloud) await runCloud(() => cloud.toggleReaction(workspace.id, activeThread.channelId, 'discussion', activeThread.id, currentUser));
        else commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) { const email = normalizeEmail(currentUser.email); thread.reactions = thread.reactions.includes(email) ? thread.reactions.filter(value => value !== email) : [...thread.reactions, email]; } return draft; });
      }} onReply={async body => {
        if (usingCloud) await runCloud(() => cloud.addReply(workspace, activeThread, currentUser, body), 'Reply posted');
        else {
          const clean = validateReply(body); commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (!thread) return draft; const reply: Reply = {id: crypto.randomUUID(), workspaceId: workspace.id, channelId: thread.channelId, threadId: thread.id, authorId: currentUser.id, authorName: currentUser.name, authorEmail: currentUser.email, initials: currentUser.initials, body: clean, createdAt: nowIso(), reactions: []}; thread.replies.push(reply); thread.updatedAt = nowIso(); draft.activity.unshift(localActivity(currentUser, 'discussion', `Replied to “${thread.title}”`, thread.id)); return draft; }, 'Demo reply posted locally');
        }
      }} onResolve={async resolution => {
        if (usingCloud) await runCloud(() => cloud.resolveDiscussion(workspace, activeThread, currentUser, resolution), 'Discussion resolved');
        else { const clean = requireText(resolution, 'Resolution', 4000); commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) { thread.status = 'resolved'; thread.boardStatus = 'complete'; thread.resolution = clean; thread.resolvedBy = currentUser.name; thread.resolvedById = currentUser.id; thread.resolvedAt = nowIso(); thread.updatedAt = nowIso(); draft.activity.unshift(localActivity(currentUser, 'resolution', `Resolved “${thread.title}”`, thread.id)); } return draft; }, 'Demo discussion resolved locally'); }
      }} onDelete={async () => {
        if (usingCloud) await runCloud(() => cloud.deleteDiscussion(workspace, activeThread, currentUser), 'Discussion deleted');
        else commitLocal(draft => { draft.threads = draft.threads.filter(item => item.id !== activeThread.id); draft.documents.forEach(doc => { doc.relatedThreadIds = doc.relatedThreadIds.filter(id => id !== activeThread.id); }); draft.activity.unshift(localActivity(currentUser, 'discussion', `Deleted “${activeThread.title}”`)); return draft; }, 'Demo discussion deleted locally'); closeDetail();
      }} onEdit={async next => {
        if (usingCloud) await runCloud(() => cloud.editDiscussion(activeThread, currentUser, next), 'Discussion updated');
        else { const clean = validateDiscussion(next.title, next.body); commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) { thread.title = clean.title; thread.body = clean.body; thread.tags = normalizeTags(next.tags); thread.updatedAt = nowIso(); } return draft; }, 'Demo discussion updated locally'); }
      }} onToggleReplyReaction={async reply => {
        if (usingCloud) await runCloud(() => cloud.toggleReaction(workspace.id, activeThread.channelId, 'reply', reply.id, currentUser));
        else commitLocal(draft => { const item = draft.threads.find(thread => thread.id === activeThread.id)?.replies.find(value => value.id === reply.id); if (item) { const email = normalizeEmail(currentUser.email); item.reactions = item.reactions.includes(email) ? item.reactions.filter(value => value !== email) : [...item.reactions, email]; } return draft; });
      }} onSetAcceptedReply={async replyId => {
        if (usingCloud) await runCloud(() => cloud.setAcceptedReply(activeThread.id, replyId), 'Key reply updated');
        else commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) thread.acceptedReplyId = replyId; return draft; }, 'Demo key reply updated locally');
      }} onEditReply={async (reply, body) => {
        if (usingCloud) await runCloud(() => cloud.editReply(reply, currentUser, body), 'Reply updated');
        else { const clean = validateReply(body); commitLocal(draft => { const item = draft.threads.find(thread => thread.id === activeThread.id)?.replies.find(value => value.id === reply.id); if (item) { item.body = clean; item.updatedAt = nowIso(); } return draft; }, 'Demo reply updated locally'); }
      }} onDeleteReply={async reply => {
        if (usingCloud) await runCloud(() => cloud.deleteReply(reply), 'Reply deleted');
        else commitLocal(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) { thread.replies = thread.replies.filter(item => item.id !== reply.id); if (thread.acceptedReplyId === reply.id) thread.acceptedReplyId = undefined; } return draft; }, 'Demo reply deleted locally');
      }} onOpenDocument={openDocument} onToast={setToast} />}

      {activeDocument && <DocumentDetail document={activeDocument} versions={documentVersions} versionsLoading={versionsLoading} workspace={workspace} canWrite={canEditDocument(activeDocument, currentMember)} canDelete={Boolean(currentMember && (currentMember.role === 'admin' || currentMember.role === 'owner' || activeDocument.authorId === currentMember.id))} currentUser={currentUser} onEdit={() => setDocumentEditor(activeDocument)} onDelete={async () => {
        if (usingCloud) await runCloud(() => cloud.deleteDocument(workspace, activeDocument, currentUser), 'Document deleted');
        else commitLocal(draft => { draft.documents = draft.documents.filter(item => item.id !== activeDocument.id); draft.threads.forEach(thread => { thread.relatedDocumentIds = thread.relatedDocumentIds.filter(id => id !== activeDocument.id); }); draft.activity.unshift(localActivity(currentUser, 'document', `Deleted “${activeDocument.title}”`)); return draft; }, 'Demo document deleted locally'); closeDetail();
      }} onOpenThread={openThread} onRestore={async version => {
        if (usingCloud) await runCloud(() => cloud.restoreDocumentVersion(workspace.id, activeDocument, version, currentUser), 'Version restored');
        else commitLocal(draft => { const document = draft.documents.find(item => item.id === activeDocument.id); if (!document) return draft; document.versions.push({id: crypto.randomUUID(), workspaceId: draft.id, channelId: document.channelId, documentId: document.id, title: document.title, content: document.content, editorId: document.lastEditorId, editorName: document.lastEditorName, editorEmail: document.lastEditorEmail, createdAt: nowIso()}); document.versionCount += 1; document.title = version.title; document.content = version.content; document.lastEditorId = currentUser.id; document.lastEditorName = currentUser.name; document.lastEditorEmail = currentUser.email; document.updatedAt = nowIso(); draft.activity.unshift(localActivity(currentUser, 'document', `Restored an earlier version of “${document.title}”`, document.id)); return draft; }, 'Demo version restored locally');
      }} />}

      {missingDetail && <div className="detail-placeholder missing-resource"><MessageSquare /><b>Item unavailable</b><span>The linked item may have been deleted or you may no longer have access to its channel.</span></div>}
      {!activeThread && !activeDocument && !missingDetail && <div className="detail-placeholder"><MessageSquare /><b>Open a discussion or document</b><span>Context, decisions, replies, and related knowledge appear here.</span></div>}
    </aside>

    <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation"><button className={view === 'home' ? 'active' : ''} onClick={() => chooseView('home')}><Home /><span>Home</span></button><button className={view === 'documents' ? 'active' : ''} onClick={() => chooseView('documents')}><BookOpen /><span>Knowledge</span></button><button onClick={() => setComposerOpen(true)} disabled={!canWrite}><PenLine /><span>Discuss</span></button><button className={view === 'notifications' ? 'active' : ''} onClick={() => chooseView('notifications')}><Inbox /><span>Inbox</span>{unread > 0 && <b>{unread}</b>}</button><button onClick={() => setMobileNav(true)}><Hash /><span>Channels</span></button></nav>

    {composerOpen && <DiscussionComposer workspace={workspace} currentUser={currentUser} defaultChannel={view === 'channel' ? channelId : workspace.channels[0]?.id || ''} onClose={() => setComposerOpen(false)} onCreate={createDiscussion} />}
    {documentEditor !== undefined && <DocumentEditor workspace={workspace} currentUser={currentUser} document={documentEditor} onClose={() => setDocumentEditor(undefined)} onSave={saveDocument} />}
    {workspacePanel && <WorkspacePanel workspaces={workspaces} activeId={workspace.id} invitations={usingCloud ? invitations : []} onChoose={id => { setActiveId(id); setWorkspacePanel(false); setView('home'); setSelectedThreadId(null); setSelectedDocumentId(null); pushRoute(routeForView(id, 'home')); }} onClose={() => setWorkspacePanel(false)} onCreate={startWorkspace} onAcceptInvite={async invitation => { if (!cloudUser) return; await runCloud(() => cloud.acceptInvitation(invitation, cloudUser), 'Invitation accepted'); }} onDeclineInvite={async invitation => { if (!cloudUser) return; await runCloud(() => cloud.declineInvitation(invitation, cloudUser), 'Invitation declined'); }} />}
    {settingsOpen && <WorkspaceSettings workspace={workspace} currentUser={currentUser} canManage={canManage && usingCloud} usingCloud={usingCloud} onClose={() => setSettingsOpen(false)} onInvite={async (email, role) => { await runCloud(() => cloud.createInvitation(workspace, currentUser, email, role), 'Invitation sent'); }} onCreateChannel={async draft => { await runCloud(() => cloud.createChannel(workspace, currentUser, draft), 'Channel created'); }} onUpdateChannel={async (channel, draft) => { await runCloud(() => cloud.updateChannel(workspace.id, channel, currentUser, draft), 'Channel updated'); }} onRoleChange={async (member, role) => { await runCloud(() => cloud.updateMemberRole(workspace.id, member, role), 'Member role updated'); }} onRemoveMember={async member => { await runCloud(() => cloud.removeMember(workspace.id, member), 'Member removed'); }} onReset={() => { if (usingCloud || !window.confirm('Reset the browser-local demo workspace and remove local demo changes?')) return; const demo = createDemoWorkspace(); setLocalWorkspaces(items => items.map(item => item.id === workspace.id ? demo : item)); setActiveId(demo.id); setSettingsOpen(false); pushRoute(routeForView(demo.id, 'home'), true); setToast('Demo workspace reset'); }} />}
    {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onMessage={setToast} />}
    {toast && <div className="toast" role="status" aria-live="polite"><CheckCircle2 />{toast}</div>}
  </div>;
}
