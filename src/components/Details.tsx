import {useState} from 'react';
import {AtSign,Bookmark,CheckCircle2,FileText,Link2,MessageSquare,PenLine,Send,ShieldCheck,ThumbsUp,Trash2} from 'lucide-react';
import type {CurrentUser,Discussion,KnowledgeDocument,Workspace} from '../types';

const normalizeEmail=(email:string)=>email.trim().toLowerCase();
const dateLabel=(iso:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));
const relative=(iso:string)=>{const minutes=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60_000));if(minutes<1)return'now';if(minutes<60)return`${minutes}m`;const hours=Math.floor(minutes/60);if(hours<24)return`${hours}h`;return`${Math.floor(hours/24)}d`;};

export function ThreadDetail({ thread, workspace, currentUser, canWrite, canManage, onUpdate, onReply, onResolve, onDelete, onOpenDocument, onToast }: {
    thread: Discussion;
    workspace: Workspace;
    currentUser: CurrentUser;
    canWrite: boolean;
    canManage: boolean;
    onUpdate: (updater: (thread: Discussion) => Discussion) => void;
    onReply: (body: string) => void;
    onResolve: () => void;
    onDelete: () => void;
    onOpenDocument: (id: string) => void;
    onToast: (text: string) => void;
}) {
    const [body, setBody] = useState('');
    const own = normalizeEmail(thread.authorEmail) === normalizeEmail(currentUser.email);
    const canModerate = canManage || own;
    const saved = thread.savedBy.includes(normalizeEmail(currentUser.email));
    const reacted = thread.reactions.includes(normalizeEmail(currentUser.email));
    const copy = async () => { try {
        await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#thread-${thread.id}`);
        onToast('Discussion link copied');
    }
    catch {
        onToast('Clipboard access was blocked');
    } };
    return <div className="detail-inner">
    <div className="detail-top"><span>Discussion</span><div><button className={saved ? 'active' : ''} onClick={() => onUpdate(item => ({ ...item, savedBy: saved ? item.savedBy.filter(email => email !== normalizeEmail(currentUser.email)) : [...item.savedBy, normalizeEmail(currentUser.email)] }))} aria-label="Bookmark"><Bookmark /></button>{canWrite && thread.status !== 'resolved' && <button onClick={onResolve} aria-label="Resolve discussion"><CheckCircle2 /></button>}{canModerate && <button className="danger-icon" onClick={onDelete} aria-label="Delete discussion"><Trash2 /></button>}</div></div>
    <div className="author"><span className="avatar big">{thread.initials}</span><div><b>{thread.authorName}</b><small>#{workspace.channels.find(channel => channel.id === thread.channelId)?.name} · {dateLabel(thread.createdAt)}</small></div></div>
    <div className="status-row"><span className={`status-pill ${thread.status}`}>{thread.status}</span>{thread.tags.map(tag => <span className="tag-pill" key={tag}>{tag}</span>)}</div>
    <h2>{thread.title}</h2><p className="body prewrap">{thread.body}</p>
    <div className="detail-actions"><button className={reacted ? 'active' : ''} onClick={() => canWrite && onUpdate(item => ({ ...item, reactions: reacted ? item.reactions.filter(email => email !== normalizeEmail(currentUser.email)) : [...item.reactions, normalizeEmail(currentUser.email)] }))}><ThumbsUp />{thread.reactions.length}</button><button onClick={copy}><Link2 />Copy link</button>{canModerate && <button onClick={() => { const next = window.prompt('Edit discussion text:', thread.body); if (next !== null && next.trim())
        onUpdate(item => ({ ...item, body: next.trim(), updatedAt: new Date().toISOString() })); }}><PenLine />Edit</button>}</div>
    {thread.resolution && <div className="resolved"><CheckCircle2 /><div><b>Resolved: {thread.resolution}</b><span>{thread.resolvedBy} · {thread.resolvedAt ? dateLabel(thread.resolvedAt) : ''}</span></div></div>}
    {thread.relatedDocumentIds.length > 0 && <section className="related-block"><b>Related knowledge</b>{thread.relatedDocumentIds.map(id => { const doc = workspace.documents.find(item => item.id === id); return doc ? <button key={id} onClick={() => onOpenDocument(id)}><FileText />{doc.title}</button> : null; })}</section>}
    <div className="reply-head"><b>{thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</b><span>Threaded context</span></div>
    <div className="replies">{thread.replies.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(reply => { const helpful = reply.reactions.includes(normalizeEmail(currentUser.email)); const accepted = thread.acceptedReplyId === reply.id; return <article key={reply.id} className={accepted ? 'accepted-reply' : ''}><span className="avatar">{reply.initials}</span><div><b>{reply.authorName}<small>{relative(reply.createdAt)}</small></b><p className="prewrap">{reply.body}</p><div className="reply-actions"><button disabled={!canWrite} onClick={() => onUpdate(item => ({ ...item, replies: item.replies.map(value => value.id === reply.id ? { ...value, reactions: helpful ? value.reactions.filter(email => email !== normalizeEmail(currentUser.email)) : [...value.reactions, normalizeEmail(currentUser.email)] } : value) }))}><ThumbsUp />Helpful{reply.reactions.length ? ` · ${reply.reactions.length}` : ''}</button>{canModerate && <button onClick={() => onUpdate(item => ({ ...item, acceptedReplyId: accepted ? undefined : reply.id }))}><CheckCircle2 />{accepted ? 'Accepted' : 'Mark key reply'}</button>}</div></div></article>; })}</div>
    {canWrite ? <form className="reply-box" onSubmit={event => { event.preventDefault(); if (body.trim()) {
        onReply(body.trim());
        setBody('');
    } }}><span className="avatar">{currentUser.initials}</span><div><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Reply with useful context. Mention a teammate with @first-name…"/><div><span><AtSign /> Mentions create inbox notifications</span><button><Send />Reply</button></div></div></form> : <div className="guest-note"><ShieldCheck />Guest access is read-only.</div>}
  </div>;
}
export function DocumentDetail({ document, workspace, canWrite, currentUser, onEdit, onOpenThread, onRestore }: {
    document: KnowledgeDocument;
    workspace: Workspace;
    canWrite: boolean;
    currentUser: CurrentUser;
    onEdit: () => void;
    onOpenThread: (id: string) => void;
    onRestore: (versionId: string) => void;
}) { return <div className="detail-inner document-detail"><div className="detail-top"><span>Knowledge document</span>{canWrite && <button onClick={onEdit}><PenLine /></button>}</div><div className="author"><span className="document-icon"><FileText /></span><div><b>{document.lastEditorName}</b><small>Updated {dateLabel(document.updatedAt)}</small></div></div><h2>{document.title}</h2><div className="tags">{document.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="document-content prewrap">{document.content}</div>{document.relatedThreadIds.length > 0 && <section className="related-block"><b>Source discussions</b>{document.relatedThreadIds.map(id => { const thread = workspace.threads.find(item => item.id === id); return thread ? <button key={id} onClick={() => onOpenThread(id)}><MessageSquare />{thread.title}</button> : null; })}</section>}<section className="version-history"><div className="reply-head"><b>Version history</b><span>{document.versions.length} saved</span></div>{document.versions.slice().reverse().map(version => <div className="version-row" key={version.id}><div><b>{version.title}</b><span>{version.editorName} · {dateLabel(version.createdAt)}</span></div>{canWrite && <button onClick={() => onRestore(version.id)}>Restore</button>}</div>)}{document.versions.length === 0 && <p className="quiet-note">Version history will appear after the first edit.</p>}</section><p className="quiet-note">Viewing as {currentUser.name}.</p></div>; }
