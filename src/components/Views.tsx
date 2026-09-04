import {type ReactNode} from 'react';
import {Bell, Check, CheckCircle2, Clock3, FileClock, FileText, LockKeyhole, MessageSquare, MoreHorizontal, Plus, Search, ThumbsUp, Users} from 'lucide-react';
import type {BoardStatus, CurrentUser, Discussion, KnowledgeDocument, Notification, Workspace} from '../types';
import {roleLabel} from '../permissions';

const boardStages: BoardStatus[] = ['backlog', 'planned', 'active', 'review', 'complete'];
const relative = (iso: string) => { const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)); if (minutes < 1) return 'now'; if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h`; return `${Math.floor(hours / 24)}d`; };
const dateLabel = (iso: string) => new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(iso));

export function NavButton({active, icon, label, count, onClick}: {active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void}) {
  return <button className={active ? 'active' : ''} onClick={onClick} aria-current={active ? 'page' : undefined}>{icon}<span>{label}</span>{count !== undefined && count > 0 && <b>{count}</b>}</button>;
}

export function LoadingScreen({label = 'Connecting your shared workspaces…'}: {label?: string}) {
  return <div className="loading-screen" role="status"><span className="logo-mark">t</span><b>Loading Threadline</b><small>{label}</small></div>;
}

export function EmptyAccount({user, onCreate, onSignOut, panel}: {user: CurrentUser | null; onCreate: () => void; onSignOut: () => void; panel: ReactNode}) {
  return <><div className="loading-screen empty-account"><span className="logo-mark">t</span><b>No workspaces yet</b><small>{user ? `Signed in as ${user.email}. Create your first workspace or accept a pending invitation.` : 'Sign in to create a shared workspace.'}</small><button className="new" onClick={onCreate}><Plus />Create workspace</button>{user && <button className="text-button" onClick={onSignOut}>Sign out</button>}</div>{panel}</>;
}

export function PageHeader({eyebrow, title, description, action}: {eyebrow: string; title: string; description: string; action?: ReactNode}) {
  return <section className="feed-head page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</section>;
}

export function HomeView({workspace, currentUser, onOpenThread, onOpenDocument}: {workspace: Workspace; currentUser: CurrentUser; onOpenThread: (id: string) => void; onOpenDocument: (id: string) => void}) {
  const recent = [...workspace.threads].filter(item => item.status !== 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const unresolved = workspace.threads.filter(item => item.status !== 'resolved' && item.status !== 'archived').length;
  return <>
    <PageHeader eyebrow="Shared memory" title={`Welcome to ${workspace.name}`} description={workspace.description} />
    <div className="overview-grid">
      <div className="metric"><MessageSquare /><span><b>{unresolved}</b><small>open discussions</small></span></div>
      <div className="metric"><CheckCircle2 /><span><b>{workspace.threads.filter(item => item.status === 'resolved').length}</b><small>recorded decisions</small></span></div>
      <div className="metric"><FileText /><span><b>{workspace.documents.length}</b><small>knowledge docs</small></span></div>
      <div className="metric"><Users /><span><b>{workspace.members.length}</b><small>workspace members</small></span></div>
    </div>
    <section className="home-section"><div className="section-heading"><div><b>Recent discussions</b><small>Latest context across channels you can access.</small></div></div><ThreadList threads={recent} workspace={workspace} onOpen={onOpenThread} /></section>
    <section className="home-section"><div className="section-heading"><div><b>Recently updated knowledge</b><small>Durable documentation connected to the work.</small></div></div>{workspace.documents.length ? <div className="document-grid">{workspace.documents.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map(doc => <DocumentCard key={doc.id} document={doc} workspace={workspace} onOpen={() => onOpenDocument(doc.id)} />)}</div> : <CompactEmpty text="No knowledge documents yet." />}</section>
    <section className="home-section"><div className="section-heading"><div><b>Member directory</b><small>People with access to this workspace and their current role.</small></div></div><div className="member-directory">{workspace.members.map(member => <article key={member.id}><span className="avatar">{member.initials}</span><div><b>{member.name}</b><small>{member.title || roleLabel(member.role)}</small></div><span>{roleLabel(member.role)}</span></article>)}</div></section>
    <p className="quiet-note">Signed in as {currentUser.name}. Threadline keeps discussion → decision → knowledge connected instead of burying context in a chat feed.</p>
  </>;
}

function CompactEmpty({text}: {text: string}) { return <div className="compact-empty">{text}</div>; }

export function ChannelView({workspace, channelId, onOpenThread}: {workspace: Workspace; channelId: string; onOpenThread: (id: string) => void}) {
  const channel = workspace.channels.find(item => item.id === channelId);
  if (!channel) return <div className="empty rich-empty"><LockKeyhole /><b>Channel unavailable</b><span>It may have been removed or you may no longer have access.</span></div>;
  const threads = workspace.threads.filter(thread => thread.channelId === channel.id && thread.status !== 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <><PageHeader eyebrow={channel.private ? 'Private channel' : 'Channel'} title={`${channel.private ? '🔒 ' : ''}#${channel.name}`} description={channel.description || 'Shared workspace context.'} /><ThreadList threads={threads} workspace={workspace} onOpen={onOpenThread} /></>;
}

export function ThreadCollection({title, description, threads, workspace, onOpenThread}: {title: string; description: string; threads: Discussion[]; workspace: Workspace; onOpenThread: (id: string) => void}) {
  return <><PageHeader eyebrow="Personal collection" title={title} description={description} /><ThreadList threads={threads} workspace={workspace} onOpen={onOpenThread} /></>;
}

export function ThreadList({threads, workspace, onOpen}: {threads: Discussion[]; workspace: Workspace; onOpen: (id: string) => void}) {
  if (!threads.length) return <div className="empty rich-empty"><MessageSquare /><b>No discussions here yet</b><span>Start a titled discussion so the context can be found later.</span></div>;
  return <div className="thread-list">{threads.map(thread => {
    const channel = workspace.channels.find(item => item.id === thread.channelId);
    return <article key={thread.id} className="thread"><span className="avatar big">{thread.initials}</span><div><div className="thread-meta"><b>{thread.authorName}</b><span>{relative(thread.updatedAt)} · {channel?.private ? '🔒 ' : ''}#{channel?.name || 'channel'}</span>{thread.status === 'resolved' && <em><CheckCircle2 />Resolved</em>}</div><h2>{thread.title}</h2><p>{thread.body}</p><div className="tags">{thread.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="stats"><span><ThumbsUp />{thread.reactions.length}</span><span><MessageSquare />{thread.replies.length}</span><span><Clock3 />{thread.views} views</span></div></div><button className="save thread-open" aria-label={`Open discussion: ${thread.title}`} onClick={() => onOpen(thread.id)}><MoreHorizontal /></button></article>;
  })}</div>;
}

export function DocumentsView({workspace, canWrite, onOpen, onCreate}: {workspace: Workspace; canWrite: boolean; onOpen: (id: string) => void; onCreate: () => void}) {
  return <><PageHeader eyebrow="Knowledge base" title="Documents" description="Processes, decisions, specifications, meeting notes, and reference material that should outlive a discussion." action={canWrite ? <button className="new" onClick={onCreate}><Plus />New document</button> : undefined} />{workspace.documents.length ? <div className="document-grid knowledge-grid">{workspace.documents.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(doc => <DocumentCard key={doc.id} document={doc} workspace={workspace} onOpen={() => onOpen(doc.id)} />)}</div> : <div className="empty rich-empty"><FileText /><b>No knowledge documents yet</b><span>Create the first durable reference page for this workspace.</span></div>}</>;
}

export function DocumentCard({document, workspace, onOpen}: {document: KnowledgeDocument; workspace: Workspace; onOpen: () => void}) {
  const channel = workspace.channels.find(item => item.id === document.channelId);
  return <button className="document-card" onClick={onOpen}><span className="document-icon"><FileText /></span><div><small>{channel?.private ? '🔒 ' : ''}{channel?.name || 'workspace'} · updated {relative(document.updatedAt)}</small><h2>{document.title}</h2><p>{document.content.replace(/[#*`]/g, '').slice(0, 150)}{document.content.length > 150 ? '…' : ''}</p><div className="tags">{document.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><span className="doc-meta"><FileClock />{document.versionCount} versions</span></button>;
}

export function BoardView({workspace, canWrite, onOpen, onMove}: {workspace: Workspace; canWrite: boolean; onOpen: (id: string) => void; onMove: (id: string, status: BoardStatus) => void}) {
  return <><PageHeader eyebrow="Lightweight context board" title="Board" description="Track the state of discussions and outcomes without turning Threadline into a project-management suite." /><div className="board-scroll"><div className="board">{boardStages.map(stage => <section className="board-column" key={stage}><div className="board-head"><b>{stage}</b><span>{workspace.threads.filter(thread => thread.boardStatus === stage && thread.status !== 'archived').length}</span></div>{workspace.threads.filter(thread => thread.boardStatus === stage && thread.status !== 'archived').map(thread => <article className="board-card" key={thread.id}><button onClick={() => onOpen(thread.id)}><small>#{workspace.channels.find(channel => channel.id === thread.channelId)?.name}</small><b>{thread.title}</b><span>{thread.replies.length} replies · {thread.tags.slice(0, 2).join(', ')}</span></button>{canWrite && <select value={thread.boardStatus} onChange={event => onMove(thread.id, event.target.value as BoardStatus)} aria-label={`Move ${thread.title}`}>{boardStages.map(item => <option key={item} value={item}>{item}</option>)}</select>}</article>)}</section>)}</div></div></>;
}

export function TimelineView({workspace, onOpenThread, onOpenDocument}: {workspace: Workspace; onOpenThread: (id: string) => void; onOpenDocument: (id: string) => void}) {
  return <><PageHeader eyebrow="Workspace history" title="Timeline" description="See how discussions, decisions, documentation, channels, and membership changes shaped the workspace." /><div className="timeline-list">{workspace.activity.length ? workspace.activity.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => {
    const navigable = Boolean(item.targetId && (item.type === 'document' || item.type === 'discussion' || item.type === 'resolution'));
    return <button key={item.id} className="timeline-item" disabled={!navigable} onClick={() => { if (!item.targetId) return; if (item.type === 'document') onOpenDocument(item.targetId); else if (item.type === 'discussion' || item.type === 'resolution') onOpenThread(item.targetId); }}><span className="timeline-dot" /><div><b>{item.summary}</b><span>{item.actorName} · {dateLabel(item.createdAt)}</span></div></button>;
  }) : <div className="empty rich-empty"><Clock3 /><b>No activity yet</b><span>Meaningful workspace changes will appear here.</span></div>}</div></>;
}

export function NotificationsView({notifications, onOpenThread, onOpenDocument, onMarkRead, onMarkAll}: {notifications: Notification[]; onOpenThread: (id: string) => void; onOpenDocument: (id: string) => void; onMarkRead: (id: string) => void; onMarkAll: () => void}) {
  return <><PageHeader eyebrow="Relevant updates" title="Inbox" description="Mentions, replies, resolutions, invitations, and important document activity." action={notifications.some(item => !item.read) ? <button className="secondary-button" onClick={onMarkAll}><Check />Mark all read</button> : undefined} /><div className="notification-list">{notifications.length ? notifications.map(item => <button key={item.id} className={item.read ? 'notification read' : 'notification'} onClick={() => { onMarkRead(item.id); if (item.targetThreadId) onOpenThread(item.targetThreadId); else if (item.targetDocumentId) onOpenDocument(item.targetDocumentId); }}><span className="notification-dot" /><div><b>{item.text}</b><small>{dateLabel(item.createdAt)}</small></div></button>) : <div className="empty rich-empty"><Bell /><b>You’re all caught up</b><span>Only relevant workspace activity will appear here.</span></div>}</div></>;
}

export function SearchView({query, results, workspace, onOpenThread, onOpenDocument}: {query: string; results: {threads: Discussion[]; documents: KnowledgeDocument[]}; workspace: Workspace; onOpenThread: (id: string) => void; onOpenDocument: (id: string) => void}) {
  const total = results.threads.length + results.documents.length;
  return <><PageHeader eyebrow="Workspace search" title={query ? `Results for “${query}”` : 'Search anything'} description={`${total} matching discussions and documents across content you can access in ${workspace.name}.`} />{!query.trim() ? <div className="empty rich-empty"><Search /><b>Search the workspace</b><span>Find discussion titles, replies, resolutions, tags, people, and knowledge.</span></div> : <div className="search-results">{results.threads.length > 0 && <section><div className="section-heading"><b>Discussions</b><span>{results.threads.length}</span></div><ThreadList threads={results.threads} workspace={workspace} onOpen={onOpenThread} /></section>}{results.documents.length > 0 && <section><div className="section-heading"><b>Documents</b><span>{results.documents.length}</span></div><div className="document-grid">{results.documents.map(doc => <DocumentCard key={doc.id} document={doc} workspace={workspace} onOpen={() => onOpenDocument(doc.id)} />)}</div></section>}{total === 0 && <div className="empty rich-empty"><Search /><b>No results found</b><span>Try a title, reply, tag, channel, author, or a word from the recorded decision.</span></div>}</div>}</>;
}
