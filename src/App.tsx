import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AtSign, Bell, Bookmark, BookOpen, Check, CheckCircle2, ChevronDown, Clock3, FileClock, FileText, Hash, Home, Inbox, Kanban, Link2, LogIn, LogOut, MessageSquare, MoreHorizontal, PanelLeft, PenLine, Plus, RotateCcw, Search, Send, Settings, ShieldCheck, Sparkles, ThumbsUp, Trash2, UserPlus, Users, X } from 'lucide-react';
import { createWorkspace as createRemoteWorkspace, firebaseReady, saveWorkspace as saveRemoteWorkspace, signInGoogle, signOutUser, watchAuth, watchWorkspaces } from './firebase';
import { createDemoWorkspace } from './seed';
import type { Activity, BoardStatus, CurrentUser, Discussion, KnowledgeDocument, Member, Notification, Role, View, Workspace } from './types';
import {BoardView,ChannelView,DocumentsView,EmptyAccount,HomeView,LoadingScreen,NavButton,NotificationsView,SearchView,ThreadCollection,TimelineView} from './components/Views';
import {DocumentDetail,ThreadDetail} from './components/Details';
import {DiscussionComposer,DocumentEditor,WorkspacePanel,WorkspaceSettings} from './components/Dialogs';
const LOCAL_KEY = 'threadline-workspaces-v2';
const ACTIVE_KEY = 'threadline-active-workspace-v2';
const boardStages: BoardStatus[] = ['backlog', 'planned', 'active', 'review', 'complete'];
const roleRank: Record<Role, number> = { guest: 0, member: 1, admin: 2, owner: 3 };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'TL';
const dateLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const relative = (iso: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1)
        return 'now';
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const clone = <T,>(value: T): T => structuredClone(value);
function readLocalWorkspaces(): Workspace[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
        if (Array.isArray(parsed) && parsed.length)
            return parsed;
    }
    catch { /* use seed */ }
    return [createDemoWorkspace()];
}
function writeLocalWorkspaces(workspaces: Workspace[]) { try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(workspaces));
}
catch { /* local mode remains usable in memory */ } }
export default function App() {
    const [localWorkspaces, setLocalWorkspaces] = useState<Workspace[]>(readLocalWorkspaces);
    const [cloudWorkspaces, setCloudWorkspaces] = useState<Workspace[]>([]);
    const [cloudUser, setCloudUser] = useState<CurrentUser | null>(null);
    const [cloudLoading, setCloudLoading] = useState(firebaseReady);
    const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || readLocalWorkspaces()[0]?.id || '');
    const [view, setView] = useState<View>('home');
    const [channelId, setChannelId] = useState('general');
    const [query, setQuery] = useState('');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [mobileNav, setMobileNav] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const [documentEditor, setDocumentEditor] = useState<KnowledgeDocument | null | undefined>(undefined);
    const [workspacePanel, setWorkspacePanel] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [toast, setToast] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const usingCloud = Boolean(firebaseReady && cloudUser);
    const workspaces = usingCloud ? cloudWorkspaces : localWorkspaces;
    const workspace = workspaces.find(item => item.id === activeId) ?? workspaces[0];
    const demoOwner = workspace?.members.find(member => member.role === 'owner') ?? workspace?.members[0];
    const currentUser: CurrentUser = cloudUser ?? {
        id: demoOwner?.id || 'demo-owner', name: demoOwner?.name || 'Jordan Blake', email: demoOwner?.email || 'jordan@northstar.example', initials: demoOwner?.initials || 'JB'
    };
    const currentMember = workspace?.members.find(member => normalizeEmail(member.email) === normalizeEmail(currentUser.email));
    const currentRole: Role = currentMember?.role ?? (usingCloud ? 'guest' : 'owner');
    const canWrite = roleRank[currentRole] >= roleRank.member;
    const canManage = roleRank[currentRole] >= roleRank.admin;
    useEffect(() => {
        if (!firebaseReady) {
            setCloudLoading(false);
            return;
        }
        return watchAuth(user => {
            if (!user?.email) {
                setCloudUser(null);
                setCloudWorkspaces([]);
                setCloudLoading(false);
                return;
            }
            setCloudUser({ id: user.uid, name: user.displayName || user.email.split('@')[0], email: normalizeEmail(user.email), initials: initials(user.displayName || user.email), avatar: user.photoURL || undefined });
            setCloudLoading(true);
        });
    }, []);
    useEffect(() => {
        if (!cloudUser?.email)
            return;
        return watchWorkspaces(cloudUser.email, items => {
            setCloudWorkspaces(items);
            setCloudLoading(false);
            if (items.length && !items.some(item => item.id === activeId))
                setActiveId(items[0].id);
        }, () => { setCloudLoading(false); setToast('Could not load shared workspaces. Check Firestore rules and connection.'); });
    }, [cloudUser?.email]);
    useEffect(() => { if (!usingCloud)
        writeLocalWorkspaces(localWorkspaces); }, [localWorkspaces, usingCloud]);
    useEffect(() => { if (activeId)
        localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);
    useEffect(() => { if (!toast)
        return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === 'Escape') {
                if (settingsOpen)
                    setSettingsOpen(false);
                else if (workspacePanel)
                    setWorkspacePanel(false);
                else if (composerOpen)
                    setComposerOpen(false);
                else if (documentEditor !== undefined)
                    setDocumentEditor(undefined);
                else if (selectedThreadId || selectedDocumentId)
                    closeDetail();
                else
                    setMobileNav(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [settingsOpen, workspacePanel, composerOpen, documentEditor, selectedThreadId, selectedDocumentId]);
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#thread-')) {
            setSelectedThreadId(hash.slice(8));
            setSelectedDocumentId(null);
        }
        if (hash.startsWith('#doc-')) {
            setSelectedDocumentId(hash.slice(5));
            setSelectedThreadId(null);
            setView('documents');
        }
    }, []);
    const commitWorkspace = (updater: (current: Workspace) => Workspace, success?: string) => {
        if (!workspace)
            return;
        const previous = workspace;
        const next = { ...updater(clone(workspace)), updatedAt: new Date().toISOString() };
        const apply = (items: Workspace[]) => items.map(item => item.id === next.id ? next : item);
        if (usingCloud) {
            setCloudWorkspaces(apply);
            void saveRemoteWorkspace(next).then(() => { if (success)
                setToast(success); }).catch(() => { setCloudWorkspaces(items => items.map(item => item.id === previous.id ? previous : item)); setToast('That change was rejected or could not be saved.'); });
        }
        else {
            setLocalWorkspaces(apply);
            if (success)
                setToast(success);
        }
    };
    const addActivity = (draft: Workspace, activity: Omit<Activity, 'id' | 'createdAt' | 'actorName'>) => {
        draft.activity = [{ ...activity, id: crypto.randomUUID(), actorName: currentUser.name, createdAt: new Date().toISOString() }, ...draft.activity].slice(0, 80);
    };
    const notify = (draft: Workspace, notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
        draft.notifications = [{ ...notification, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false }, ...draft.notifications].slice(0, 120);
    };
    const chooseView = (next: View) => { setView(next); setQuery(''); setMobileNav(false); if (next !== 'channel')
        setChannelId(channelId); closeDetail(); };
    const chooseChannel = (id: string) => { setChannelId(id); setView('channel'); setQuery(''); setMobileNav(false); closeDetail(); };
    const openThread = (id: string) => { setSelectedThreadId(id); setSelectedDocumentId(null); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#thread-${id}`); if (canWrite)
        commitWorkspace(draft => { const thread = draft.threads.find(item => item.id === id); if (thread)
            thread.views += 1; return draft; }); };
    const openDocument = (id: string) => { setSelectedDocumentId(id); setSelectedThreadId(null); setView('documents'); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#doc-${id}`); };
    const closeDetail = () => { setSelectedThreadId(null); setSelectedDocumentId(null); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); };
    const activeThread = workspace?.threads.find(item => item.id === selectedThreadId);
    const activeDocument = workspace?.documents.find(item => item.id === selectedDocumentId);
    const unread = workspace?.notifications.filter(item => normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email) && !item.read).length ?? 0;
    const searchResults = useMemo(() => {
        if (!workspace || !query.trim())
            return { threads: [] as Discussion[], documents: [] as KnowledgeDocument[] };
        const q = query.trim().toLowerCase();
        return {
            threads: workspace.threads.filter(thread => `${thread.title} ${thread.body} ${thread.authorName} ${thread.tags.join(' ')} ${workspace.channels.find(channel => channel.id === thread.channelId)?.name || ''} ${thread.resolution || ''}`.toLowerCase().includes(q)),
            documents: workspace.documents.filter(doc => `${doc.title} ${doc.content} ${doc.tags.join(' ')} ${doc.lastEditorName}`.toLowerCase().includes(q))
        };
    }, [workspace, query]);
    const startWorkspace = async (name: string, description: string) => {
        const now = new Date().toISOString();
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'workspace'}-${crypto.randomUUID().slice(0, 6)}`;
        const email = normalizeEmail(currentUser.email);
        const next: Workspace = { id, name: name.trim(), description: description.trim(), ownerId: currentUser.id, ownerEmail: email, memberEmails: [email], adminEmails: [email], guestEmails: [], members: [{ id: currentUser.id, name: currentUser.name, email, initials: currentUser.initials, role: 'owner', joinedAt: now, avatar: currentUser.avatar }], channels: [{ id: 'general', name: 'general', description: 'Workspace-wide discussion and shared context.' }], threads: [], documents: [], activity: [{ id: crypto.randomUUID(), type: 'workspace', summary: `Created ${name.trim()}`, actorName: currentUser.name, createdAt: now }], notifications: [], createdAt: now, updatedAt: now };
        try {
            if (usingCloud) {
                await createRemoteWorkspace(next);
                setCloudWorkspaces(items => [...items, next]);
            }
            else
                setLocalWorkspaces(items => [...items, next]);
            setActiveId(id);
            setWorkspacePanel(false);
            setView('home');
            setToast('Workspace created');
        }
        catch {
            setToast('Workspace could not be created. Check Firebase access.');
        }
    };
    if (cloudLoading && usingCloud && !workspace)
        return <LoadingScreen />;
    if (!workspace)
        return <EmptyAccount user={cloudUser} onCreate={() => setWorkspacePanel(true)} onSignOut={() => void signOutUser()} panel={workspacePanel ? <WorkspacePanel workspaces={[]} activeId="" onChoose={() => { }} onClose={() => setWorkspacePanel(false)} onCreate={startWorkspace}/> : null}/>;
    return <div className="shell app-shell">
    <aside className={mobileNav ? 'rail open' : 'rail'}>
      <div className="logo"><span>t</span>threadline</div>
      <button className="workspace" onClick={() => setWorkspacePanel(true)}>
        <span className="avatar">{workspace.name.slice(0, 2).toUpperCase()}</span><span><b>{workspace.name}</b><small>{workspace.members.length} members · {usingCloud ? 'shared' : 'demo'} workspace</small></span><ChevronDown size={15}/>
      </button>
      <nav className="primary-nav">
        <NavButton active={view === 'home'} icon={<Home />} label="Home" onClick={() => chooseView('home')}/>
        <NavButton active={view === 'notifications'} icon={<Inbox />} label="Inbox" count={unread} onClick={() => chooseView('notifications')}/>
        <NavButton active={view === 'saved'} icon={<Bookmark />} label="Saved" count={workspace.threads.filter(thread => thread.savedBy.includes(normalizeEmail(currentUser.email))).length} onClick={() => chooseView('saved')}/>
        <NavButton active={view === 'documents'} icon={<BookOpen />} label="Knowledge" count={workspace.documents.length} onClick={() => chooseView('documents')}/>
        <NavButton active={view === 'board'} icon={<Kanban />} label="Board" onClick={() => chooseView('board')}/>
        <NavButton active={view === 'timeline'} icon={<Clock3 />} label="Timeline" onClick={() => chooseView('timeline')}/>
      </nav>
      <div className="nav-head">Channels {canManage && <button className="tiny-icon" onClick={() => setSettingsOpen(true)} aria-label="Manage channels"><Plus size={13}/></button>}</div>
      <div className="channels">
        {workspace.channels.filter(channel => !channel.private || canManage || channel.memberEmails?.includes(normalizeEmail(currentUser.email))).map(channel => <button className={view === 'channel' && channelId === channel.id ? 'active' : ''} key={channel.id} onClick={() => chooseChannel(channel.id)}><Hash />{channel.name}<b>{workspace.threads.filter(thread => thread.channelId === channel.id && thread.status !== 'archived').length}</b></button>)}
      </div>
      <div className="people member-strip">
        <div className="nav-head">Members <span>{workspace.members.length}</span></div>
        {workspace.members.slice(0, 5).map(member => <div key={member.email}><span className="avatar">{member.initials}</span><span>{member.name}<small>{member.role}</small></span></div>)}
      </div>
      <div className="rail-bottom">
        <button className="settings" onClick={() => setSettingsOpen(true)}><Settings />Workspace settings</button>
        {firebaseReady ? <button className="settings" onClick={() => cloudUser ? void signOutUser() : void signInGoogle()}>{cloudUser ? <LogOut /> : <LogIn />}{cloudUser ? 'Sign out' : 'Sign in to collaborate'}</button> : null}
      </div>
    </aside>
    {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>} 

    <main className="feed workspace-feed">
      <header>
        <button className="mobile" onClick={() => setMobileNav(value => !value)} aria-label="Toggle workspace navigation"><PanelLeft /></button>
        <div className="search"><Search /><input ref={searchRef} value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim())
        setView('search'); }} placeholder="Search anything…" aria-label="Search discussions and documents"/><kbd>⌘ K</kbd></div>
        <button className="bell" onClick={() => chooseView('notifications')} aria-label="Notifications"><Bell />{unread > 0 && <i />}</button>
        {canWrite && <button className="new" onClick={() => setComposerOpen(true)}><PenLine />New discussion</button>}
      </header>

      {view === 'home' && <HomeView workspace={workspace} currentUser={currentUser} onOpenThread={openThread} onOpenDocument={openDocument}/>} 
      {view === 'channel' && <ChannelView workspace={workspace} channelId={channelId} onOpenThread={openThread}/>} 
      {view === 'saved' && <ThreadCollection title="Saved" description="Discussions you bookmarked for quick reference." threads={workspace.threads.filter(thread => thread.savedBy.includes(normalizeEmail(currentUser.email)))} workspace={workspace} onOpenThread={openThread}/>} 
      {view === 'documents' && <DocumentsView workspace={workspace} canWrite={canWrite} onOpen={openDocument} onCreate={() => setDocumentEditor(null)}/>} 
      {view === 'board' && <BoardView workspace={workspace} canWrite={canWrite} onOpen={openThread} onMove={(threadId, status) => commitWorkspace(draft => { const thread = draft.threads.find(item => item.id === threadId); if (thread) {
        thread.boardStatus = status;
        thread.updatedAt = new Date().toISOString();
        addActivity(draft, { type: 'discussion', summary: `Moved “${thread.title}” to ${status}`, targetId: thread.id });
    } return draft; }, 'Board updated')}/>} 
      {view === 'timeline' && <TimelineView workspace={workspace} onOpenThread={openThread} onOpenDocument={openDocument}/>} 
      {view === 'notifications' && <NotificationsView notifications={workspace.notifications.filter(item => normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email))} onOpenThread={openThread} onOpenDocument={openDocument} onMarkRead={id => commitWorkspace(draft => { const item = draft.notifications.find(notification => notification.id === id); if (item)
        item.read = true; return draft; })} onMarkAll={() => commitWorkspace(draft => { draft.notifications.forEach(item => { if (normalizeEmail(item.recipientEmail) === normalizeEmail(currentUser.email))
        item.read = true; }); return draft; }, 'Inbox cleared')}/>} 
      {view === 'search' && <SearchView query={query} results={searchResults} workspace={workspace} onOpenThread={openThread} onOpenDocument={openDocument}/>} 
    </main>

    <aside className={(activeThread || activeDocument) ? 'detail detail-open' : 'detail'} aria-label="Content details">
      <button className="detail-close" onClick={closeDetail} aria-label="Close details"><X /></button>
      {activeThread && <ThreadDetail thread={activeThread} workspace={workspace} currentUser={currentUser} canWrite={canWrite} canManage={canManage} onUpdate={update => commitWorkspace(draft => { const index = draft.threads.findIndex(item => item.id === activeThread.id); if (index >= 0)
        draft.threads[index] = update(draft.threads[index]); return draft; })} onReply={body => commitWorkspace(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (!thread)
        return draft; thread.replies.push({ id: crypto.randomUUID(), authorId: currentUser.id, authorName: currentUser.name, authorEmail: normalizeEmail(currentUser.email), initials: currentUser.initials, body, createdAt: new Date().toISOString(), reactions: [] }); thread.updatedAt = new Date().toISOString(); addActivity(draft, { type: 'discussion', summary: `Replied to “${thread.title}”`, targetId: thread.id }); for (const member of draft.members) {
        if (member.email !== normalizeEmail(currentUser.email) && body.toLowerCase().includes(`@${member.name.toLowerCase().split(' ')[0]}`))
            notify(draft, { recipientEmail: member.email, text: `${currentUser.name} mentioned you in “${thread.title}”.`, targetThreadId: thread.id });
    } return draft; }, 'Reply posted')} onResolve={() => { const resolution = window.prompt('Record the decision or outcome for this discussion:', activeThread.resolution || ''); if (resolution === null)
        return; commitWorkspace(draft => { const thread = draft.threads.find(item => item.id === activeThread.id); if (thread) {
        thread.status = 'resolved';
        thread.boardStatus = 'complete';
        thread.resolution = resolution.trim() || 'Resolved without a written summary.';
        thread.resolvedBy = currentUser.name;
        thread.resolvedAt = new Date().toISOString();
        thread.updatedAt = new Date().toISOString();
        addActivity(draft, { type: 'resolution', summary: `Resolved “${thread.title}”`, targetId: thread.id });
        for (const member of draft.members) {
            if (member.email !== normalizeEmail(currentUser.email))
                notify(draft, { recipientEmail: member.email, text: `${currentUser.name} resolved “${thread.title}”.`, targetThreadId: thread.id });
        }
    } return draft; }, 'Discussion resolved'); }} onDelete={() => { if (!window.confirm(`Delete “${activeThread.title}”?`))
        return; commitWorkspace(draft => { draft.threads = draft.threads.filter(item => item.id !== activeThread.id); addActivity(draft, { type: 'discussion', summary: `Deleted “${activeThread.title}”` }); return draft; }, 'Discussion deleted'); closeDetail(); }} onOpenDocument={openDocument} onToast={setToast}/>} 
      {activeDocument && <DocumentDetail document={activeDocument} workspace={workspace} canWrite={canWrite} currentUser={currentUser} onEdit={() => setDocumentEditor(activeDocument)} onOpenThread={openThread} onRestore={versionId => commitWorkspace(draft => { const doc = draft.documents.find(item => item.id === activeDocument.id); const version = doc?.versions.find(item => item.id === versionId); if (doc && version) {
        doc.versions.push({ id: crypto.randomUUID(), title: doc.title, content: doc.content, editorName: currentUser.name, editorEmail: normalizeEmail(currentUser.email), createdAt: new Date().toISOString() });
        doc.title = version.title;
        doc.content = version.content;
        doc.lastEditorName = currentUser.name;
        doc.lastEditorEmail = normalizeEmail(currentUser.email);
        doc.updatedAt = new Date().toISOString();
        addActivity(draft, { type: 'document', summary: `Restored an earlier version of “${doc.title}”`, targetId: doc.id });
    } return draft; }, 'Version restored')}/>} 
      {!activeThread && !activeDocument && <div className="detail-placeholder"><MessageSquare /><b>Open a discussion or document</b><span>Context, decisions, replies, and related knowledge appear here.</span></div>}
    </aside>

    {composerOpen && <DiscussionComposer workspace={workspace} currentUser={currentUser} defaultChannel={view === 'channel' ? channelId : 'general'} onClose={() => setComposerOpen(false)} onCreate={thread => { commitWorkspace(draft => { draft.threads = [thread, ...draft.threads]; addActivity(draft, { type: 'discussion', summary: `Started “${thread.title}”`, targetId: thread.id }); return draft; }, 'Discussion published'); setComposerOpen(false); setView('channel'); setChannelId(thread.channelId); openThread(thread.id); }}/>} 
    {documentEditor !== undefined && <DocumentEditor workspace={workspace} currentUser={currentUser} document={documentEditor} onClose={() => setDocumentEditor(undefined)} onSave={doc => { commitWorkspace(draft => { const existing = draft.documents.find(item => item.id === doc.id); if (existing) {
        const previous = { id: crypto.randomUUID(), title: existing.title, content: existing.content, editorName: existing.lastEditorName, editorEmail: existing.lastEditorEmail, createdAt: existing.updatedAt };
        doc.versions = [...existing.versions, previous];
    }
    else
        addActivity(draft, { type: 'document', summary: `Created “${doc.title}”`, targetId: doc.id }); draft.documents = existing ? draft.documents.map(item => item.id === doc.id ? doc : item) : [doc, ...draft.documents]; if (existing)
        addActivity(draft, { type: 'document', summary: `Updated “${doc.title}”`, targetId: doc.id }); return draft; }, 'Document saved'); setDocumentEditor(undefined); openDocument(doc.id); }}/>} 
    {workspacePanel && <WorkspacePanel workspaces={workspaces} activeId={workspace.id} onChoose={id => { setActiveId(id); setWorkspacePanel(false); setView('home'); closeDetail(); }} onClose={() => setWorkspacePanel(false)} onCreate={startWorkspace}/>} 
    {settingsOpen && <WorkspaceSettings workspace={workspace} currentUser={currentUser} canManage={canManage} usingCloud={usingCloud} onClose={() => setSettingsOpen(false)} onUpdate={(updater, message) => commitWorkspace(updater, message)} onReset={() => { if (usingCloud || !window.confirm('Reset the demo workspace and remove local changes?'))
        return; const demo = createDemoWorkspace(); setLocalWorkspaces(items => items.map(item => item.id === workspace.id ? demo : item)); setActiveId(demo.id); setSettingsOpen(false); setToast('Demo workspace reset'); }}/>} 
    {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
  </div>;
}
