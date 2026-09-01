import {useState} from 'react';
import {AtSign, Bookmark, CheckCircle2, FileText, Link2, MessageSquare, PenLine, Send, ShieldCheck, ThumbsUp, Trash2, X} from 'lucide-react';
import type {CurrentUser, Discussion, DocumentVersion, KnowledgeDocument, Reply, Workspace} from '../types';
import {limits} from '../validation';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const dateLabel = (iso: string) => new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(iso));
const relative = (iso: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export function ThreadDetail({thread, workspace, currentUser, canWrite, canManage, onToggleBookmark, onToggleThreadReaction, onReply, onResolve, onDelete, onEdit, onToggleReplyReaction, onSetAcceptedReply, onEditReply, onDeleteReply, onOpenDocument, onToast}: {
  thread: Discussion;
  workspace: Workspace;
  currentUser: CurrentUser;
  canWrite: boolean;
  canManage: boolean;
  onToggleBookmark: () => Promise<void> | void;
  onToggleThreadReaction: () => Promise<void> | void;
  onReply: (body: string) => Promise<void> | void;
  onResolve: (resolution: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onEdit: (draft: {title: string; body: string; tags: string[]}) => Promise<void> | void;
  onToggleReplyReaction: (reply: Reply) => Promise<void> | void;
  onSetAcceptedReply: (replyId: string | undefined) => Promise<void> | void;
  onEditReply: (reply: Reply, body: string) => Promise<void> | void;
  onDeleteReply: (reply: Reply) => Promise<void> | void;
  onOpenDocument: (id: string) => void;
  onToast: (text: string) => void;
}) {
  const [body, setBody] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(thread.title);
  const [editBody, setEditBody] = useState(thread.body);
  const [editTags, setEditTags] = useState(thread.tags.join(', '));
  const [resolveMode, setResolveMode] = useState(false);
  const [resolution, setResolution] = useState(thread.resolution || '');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const own = thread.authorId === currentUser.id || normalizeEmail(thread.authorEmail) === normalizeEmail(currentUser.email);
  const canModerate = canManage || own;
  const saved = thread.savedBy.includes(normalizeEmail(currentUser.email));
  const reacted = thread.reactions.includes(normalizeEmail(currentUser.email));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onToast('Discussion link copied');
    } catch {
      onToast('Clipboard access was blocked');
    }
  };

  return <div className="detail-inner">
    <div className="detail-top"><span>Discussion</span><div><button className={saved ? 'active' : ''} onClick={() => void onToggleBookmark()} aria-label={saved ? 'Remove bookmark' : 'Bookmark discussion'}><Bookmark /></button>{canWrite && thread.status !== 'resolved' && <button onClick={() => setResolveMode(value => !value)} aria-label="Resolve discussion"><CheckCircle2 /></button>}{canModerate && <button className="danger-icon" onClick={() => { if (window.confirm(`Delete “${thread.title}” and its replies?`)) void onDelete(); }} aria-label="Delete discussion"><Trash2 /></button>}</div></div>
    <div className="author"><span className="avatar big">{thread.initials}</span><div><b>{thread.authorName}</b><small>#{workspace.channels.find(channel => channel.id === thread.channelId)?.name} · {dateLabel(thread.createdAt)}{thread.updatedAt !== thread.createdAt ? ' · edited' : ''}</small></div></div>
    <div className="status-row"><span className={`status-pill ${thread.status}`}>{thread.status}</span>{thread.tags.map(tag => <span className="tag-pill" key={tag}>{tag}</span>)}</div>

    {editMode ? <form className="inline-detail-editor" onSubmit={event => {
      event.preventDefault();
      const tags = [...new Set(editTags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
      void Promise.resolve(onEdit({title: editTitle, body: editBody, tags})).then(() => setEditMode(false));
    }}><label>Title<input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={limits.discussionTitle} required /></label><label>Context<textarea value={editBody} onChange={event => setEditBody(event.target.value)} maxLength={limits.discussionBody} required /></label><label>Tags<input value={editTags} onChange={event => setEditTags(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditMode(false)}><X />Cancel</button><button className="publish"><Send />Save changes</button></div></form> : <><h2>{thread.title}</h2><p className="body prewrap">{thread.body}</p></>}

    <div className="detail-actions"><button disabled={!canWrite} className={reacted ? 'active' : ''} onClick={() => void onToggleThreadReaction()}><ThumbsUp />{thread.reactions.length}</button><button onClick={() => void copy()}><Link2 />Copy link</button>{canModerate && !editMode && <button onClick={() => { setEditTitle(thread.title); setEditBody(thread.body); setEditTags(thread.tags.join(', ')); setEditMode(true); }}><PenLine />Edit</button>}</div>

    {resolveMode && thread.status !== 'resolved' && <form className="resolution-editor" onSubmit={event => { event.preventDefault(); void Promise.resolve(onResolve(resolution)).then(() => setResolveMode(false)); }}><label>Decision or outcome<textarea autoFocus value={resolution} onChange={event => setResolution(event.target.value)} maxLength={4000} placeholder="Record the final decision and enough rationale to make it useful later…" required /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setResolveMode(false)}>Cancel</button><button className="publish"><CheckCircle2 />Resolve discussion</button></div></form>}
    {thread.resolution && <div className="resolved"><CheckCircle2 /><div><b>Resolved: {thread.resolution}</b><span>{thread.resolvedBy} · {thread.resolvedAt ? dateLabel(thread.resolvedAt) : ''}</span></div></div>}

    {thread.relatedDocumentIds.length > 0 && <section className="related-block"><b>Related knowledge</b>{thread.relatedDocumentIds.map(id => { const doc = workspace.documents.find(item => item.id === id); return doc ? <button key={id} onClick={() => onOpenDocument(id)}><FileText />{doc.title}</button> : <div className="stale-reference" key={id}>A related document is no longer available.</div>; })}</section>}

    <div className="reply-head"><b>{thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</b><span>Chronological context</span></div>
    <div className="replies">{thread.replies.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(reply => {
      const helpful = reply.reactions.includes(normalizeEmail(currentUser.email));
      const accepted = thread.acceptedReplyId === reply.id;
      const canEditThisReply = canManage || reply.authorId === currentUser.id || normalizeEmail(reply.authorEmail) === normalizeEmail(currentUser.email);
      return <article key={reply.id} className={accepted ? 'accepted-reply' : ''}><span className="avatar">{reply.initials}</span><div><b>{reply.authorName}<small>{relative(reply.updatedAt || reply.createdAt)}{reply.updatedAt ? ' · edited' : ''}</small></b>{editingReplyId === reply.id ? <form className="reply-editor" onSubmit={event => { event.preventDefault(); void Promise.resolve(onEditReply(reply, replyDraft)).then(() => setEditingReplyId(null)); }}><textarea value={replyDraft} onChange={event => setReplyDraft(event.target.value)} maxLength={limits.replyBody} autoFocus required /><div><button type="button" onClick={() => setEditingReplyId(null)}>Cancel</button><button>Save</button></div></form> : <p className="prewrap">{reply.body}</p>}<div className="reply-actions"><button disabled={!canWrite} onClick={() => void onToggleReplyReaction(reply)}><ThumbsUp />Helpful{reply.reactions.length ? ` · ${reply.reactions.length}` : ''}</button>{canModerate && <button onClick={() => void onSetAcceptedReply(accepted ? undefined : reply.id)}><CheckCircle2 />{accepted ? 'Accepted' : 'Mark key reply'}</button>}{canEditThisReply && editingReplyId !== reply.id && <button onClick={() => { setEditingReplyId(reply.id); setReplyDraft(reply.body); }}><PenLine />Edit</button>}{canEditThisReply && <button className="danger-text" onClick={() => { if (window.confirm('Delete this reply?')) void onDeleteReply(reply); }}><Trash2 />Delete</button>}</div></div></article>;
    })}</div>

    {canWrite ? <form className="reply-box" onSubmit={event => {
      event.preventDefault();
      const next = body.trim();
      if (!next) return;
      void Promise.resolve(onReply(next)).then(() => setBody(''));
    }}><span className="avatar">{currentUser.initials}</span><div><textarea value={body} onChange={event => setBody(event.target.value)} maxLength={limits.replyBody} placeholder="Reply with useful context. Mention a teammate with @first-name or @full-name…" /><div><span><AtSign /> Mentions create inbox notifications</span><button><Send />Reply</button></div></div></form> : <div className="guest-note"><ShieldCheck />Guest access is read-only.</div>}
  </div>;
}

export function DocumentDetail({document, versions, versionsLoading, workspace, canWrite, canDelete, currentUser, onEdit, onDelete, onOpenThread, onRestore}: {
  document: KnowledgeDocument;
  versions: DocumentVersion[];
  versionsLoading: boolean;
  workspace: Workspace;
  canWrite: boolean;
  canDelete: boolean;
  currentUser: CurrentUser;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
  onOpenThread: (id: string) => void;
  onRestore: (version: DocumentVersion) => Promise<void> | void;
}) {
  return <div className="detail-inner document-detail">
    <div className="detail-top"><span>Knowledge document</span><div>{canWrite && <button onClick={onEdit} aria-label="Edit document"><PenLine /></button>}{canDelete && <button className="danger-icon" onClick={() => { if (window.confirm(`Delete “${document.title}”?`)) void onDelete(); }} aria-label="Delete document"><Trash2 /></button>}</div></div>
    <div className="author"><span className="document-icon"><FileText /></span><div><b>{document.lastEditorName}</b><small>Updated {dateLabel(document.updatedAt)}</small></div></div>
    <h2>{document.title}</h2><div className="tags">{document.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    <div className="document-content prewrap">{document.content}</div>
    {document.relatedThreadIds.length > 0 && <section className="related-block"><b>Source discussions</b>{document.relatedThreadIds.map(id => { const thread = workspace.threads.find(item => item.id === id); return thread ? <button key={id} onClick={() => onOpenThread(id)}><MessageSquare />{thread.title}</button> : <div className="stale-reference" key={id}>A source discussion is no longer available.</div>; })}</section>}
    <section className="version-history"><div className="reply-head"><b>Version history</b><span>{document.versionCount} saved</span></div>{versionsLoading ? <div className="inline-loading" aria-live="polite">Loading version history…</div> : versions.map(version => <div className="version-row" key={version.id}><div><b>{version.title}</b><span>{version.editorName} · {dateLabel(version.createdAt)}</span></div>{canWrite && <button onClick={() => { if (window.confirm(`Restore the version from ${dateLabel(version.createdAt)}? The current content will also be preserved in history.`)) void onRestore(version); }}>Restore</button>}</div>)}{!versionsLoading && versions.length === 0 && <p className="quiet-note">Version history will appear after the first meaningful edit.</p>}</section>
    <p className="quiet-note">Viewing as {currentUser.name}.</p>
  </div>;
}
