import {useMemo, useState} from 'react';
import {Check, FileText, LockKeyhole, Plus, RotateCcw, Send, Settings, ShieldCheck, Sparkles, Trash2, UserPlus, Users, X} from 'lucide-react';
import type {Channel, CurrentUser, Invitation, KnowledgeDocument, Member, Role, Workspace} from '../types';
import {limits, normalizeTags} from '../validation';
import {roleLabel} from '../permissions';
import {Modal} from './Modal';

export type DiscussionDraft = {channelId: string; title: string; body: string; tags: string[]};
export type ChannelDraft = {name: string; description: string; private: boolean; memberIds: string[]};

export function DiscussionComposer({workspace, defaultChannel, onClose, onCreate}: {
  workspace: Workspace;
  currentUser: CurrentUser;
  defaultChannel: string;
  onClose: () => void;
  onCreate: (draft: DiscussionDraft) => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channelId, setChannelId] = useState(workspace.channels.some(item => item.id === defaultChannel) ? defaultChannel : workspace.channels[0]?.id || '');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  return <Modal titleId="discussion-composer-title" onClose={onClose} className="composer">
    <form onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      Promise.resolve(onCreate({channelId, title, body, tags: normalizeTags(tags)})).finally(() => setBusy(false));
    }}>
      <button type="button" className="close" onClick={onClose} aria-label="Close discussion composer"><X /></button>
      <span className="compose-icon"><Sparkles /></span>
      <h2 id="discussion-composer-title">Start a useful discussion</h2>
      <p>Give the conversation a durable title and enough context for someone who was not in the room.</p>
      <label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={limits.discussionTitle} placeholder="What are we deciding or trying to understand?" required /></label>
      <label>Channel<select value={channelId} onChange={event => setChannelId(event.target.value)} required>{workspace.channels.map(channel => <option key={channel.id} value={channel.id}>{channel.private ? '🔒 ' : ''}#{channel.name}</option>)}</select></label>
      <label>Context<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={limits.discussionBody} placeholder="Add the evidence, constraints, tradeoffs, or question…" required /></label>
      <label>Tags<input value={tags} onChange={event => setTags(event.target.value)} placeholder="decision, api, onboarding" /><small>Up to {limits.tags} normalized tags.</small></label>
      <button className="publish" disabled={busy}><Send />{busy ? 'Publishing…' : 'Publish discussion'}</button>
    </form>
  </Modal>;
}

export function DocumentEditor({workspace, currentUser, document, onClose, onSave}: {
  workspace: Workspace;
  currentUser: CurrentUser;
  document: KnowledgeDocument | null;
  onClose: () => void;
  onSave: (document: KnowledgeDocument) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [channelId, setChannelId] = useState(document?.channelId || workspace.channels[0]?.id || '');
  const [tags, setTags] = useState(document?.tags.join(', ') || '');
  const [related, setRelated] = useState<string[]>(document?.relatedThreadIds || []);
  const [busy, setBusy] = useState(false);
  const eligibleThreads = workspace.threads.filter(thread => thread.channelId === channelId);
  return <Modal titleId="document-editor-title" onClose={onClose} className="composer document-composer">
    <form onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const now = new Date().toISOString();
      const next: KnowledgeDocument = {
        id: document?.id || crypto.randomUUID(),
        workspaceId: workspace.id,
        title,
        content,
        channelId,
        tags: normalizeTags(tags),
        authorId: document?.authorId || currentUser.id,
        authorName: document?.authorName || currentUser.name,
        authorEmail: document?.authorEmail || currentUser.email,
        lastEditorId: currentUser.id,
        lastEditorName: currentUser.name,
        lastEditorEmail: currentUser.email,
        createdAt: document?.createdAt || now,
        updatedAt: now,
        versionCount: document?.versionCount || 0,
        versions: document?.versions || [],
        relatedThreadIds: related.filter(id => eligibleThreads.some(thread => thread.id === id)),
      };
      setBusy(true);
      Promise.resolve(onSave(next)).finally(() => setBusy(false));
    }}>
      <button type="button" className="close" onClick={onClose} aria-label="Close document editor"><X /></button>
      <span className="compose-icon"><FileText /></span>
      <h2 id="document-editor-title">{document ? 'Edit knowledge document' : 'Create knowledge document'}</h2>
      <p>Preserve durable knowledge and connect it back to the discussions that produced it.</p>
      <label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={limits.documentTitle} required /></label>
      <label>Channel<select value={channelId} onChange={event => { setChannelId(event.target.value); setRelated([]); }} required>{workspace.channels.map(channel => <option key={channel.id} value={channel.id}>{channel.private ? '🔒 ' : ''}#{channel.name}</option>)}</select></label>
      <label>Content<textarea className="document-textarea" value={content} onChange={event => setContent(event.target.value)} maxLength={limits.documentBody} placeholder="Use clear headings and durable context…" required /></label>
      <label>Tags<input value={tags} onChange={event => setTags(event.target.value)} placeholder="process, onboarding, reference" /></label>
      <fieldset className="source-discussions"><legend>Source discussions</legend>{eligibleThreads.length ? eligibleThreads.map(thread => <label key={thread.id}><input type="checkbox" checked={related.includes(thread.id)} onChange={event => setRelated(items => event.target.checked ? [...new Set([...items, thread.id])] : items.filter(id => id !== thread.id))} />{thread.title}</label>) : <span>No discussions are available in this channel yet.</span>}</fieldset>
      <button className="publish" disabled={busy}><Send />{busy ? 'Saving…' : 'Save document'}</button>
    </form>
  </Modal>;
}

export function WorkspacePanel({workspaces, activeId, invitations, onChoose, onClose, onCreate, onAcceptInvite, onDeclineInvite}: {
  workspaces: Workspace[];
  activeId: string;
  invitations: Invitation[];
  onChoose: (id: string) => void;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void> | void;
  onAcceptInvite: (invitation: Invitation) => Promise<void> | void;
  onDeclineInvite: (invitation: Invitation) => Promise<void> | void;
}) {
  const [creating, setCreating] = useState(workspaces.length === 0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  return <Modal titleId="workspace-panel-title" onClose={onClose} className="settings-panel workspace-panel">
    <button className="close" onClick={onClose} aria-label="Close workspace switcher"><X /></button>
    <span className="compose-icon"><Users /></span>
    <h2 id="workspace-panel-title">Workspaces</h2>
    <p>Keep teams and organizations isolated. Cloud workspaces are available only through a real membership.</p>
    {invitations.length > 0 && <section className="settings-section invite-inbox"><div className="section-heading"><div><b>Pending invitations</b><small>Membership is created only after you accept.</small></div><span>{invitations.length}</span></div>{invitations.map(invitation => <article key={invitation.id}><div><b>{invitation.workspaceName}</b><small>{roleLabel(invitation.role)} · invited by {invitation.createdByName}</small></div><div><button className="secondary-button" onClick={() => void onDeclineInvite(invitation)}>Decline</button><button className="publish" onClick={() => void onAcceptInvite(invitation)}>Accept</button></div></article>)}</section>}
    <div className="workspace-list">{workspaces.map(workspace => <button key={workspace.id} className={workspace.id === activeId ? 'active' : ''} onClick={() => onChoose(workspace.id)}><span className="avatar">{workspace.name.slice(0, 2).toUpperCase()}</span><span><b>{workspace.name}</b><small>{workspace.description || `${workspace.members.length} members`}</small></span>{workspace.id === activeId && <Check />}</button>)}</div>
    {creating ? <form className="inline-form" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      Promise.resolve(onCreate(name, description)).finally(() => setBusy(false));
    }}><label>Name<input autoFocus value={name} onChange={event => setName(event.target.value)} maxLength={limits.workspaceName} placeholder="Acme Product Team" required /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={limits.workspaceDescription} placeholder="What is this workspace for?" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancel</button><button className="publish" disabled={busy}><Plus />{busy ? 'Creating…' : 'Create workspace'}</button></div></form> : <button className="wide-secondary" onClick={() => setCreating(true)}><Plus />Create another workspace</button>}
  </Modal>;
}

export function WorkspaceSettings({workspace, currentUser, canManage, usingCloud, onClose, onInvite, onCreateChannel, onUpdateChannel, onRoleChange, onRemoveMember, onReset}: {
  workspace: Workspace;
  currentUser: CurrentUser;
  canManage: boolean;
  usingCloud: boolean;
  onClose: () => void;
  onInvite: (email: string, role: Exclude<Role, 'owner'>) => Promise<void> | void;
  onCreateChannel: (draft: ChannelDraft) => Promise<void> | void;
  onUpdateChannel: (channel: Channel, draft: Omit<ChannelDraft, 'name'>) => Promise<void> | void;
  onRoleChange: (member: Member, role: Exclude<Role, 'owner'>) => Promise<void> | void;
  onRemoveMember: (member: Member) => Promise<void> | void;
  onReset: () => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'owner'>>('member');
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [privateChannel, setPrivateChannel] = useState(false);
  const [channelMemberIds, setChannelMemberIds] = useState<string[]>([]);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingPrivate, setEditingPrivate] = useState(false);
  const [editingMemberIds, setEditingMemberIds] = useState<string[]>([]);
  const currentRole = workspace.members.find(member => member.id === currentUser.id)?.role || (usingCloud ? 'guest' : 'owner');
  const selectableMembers = useMemo(() => workspace.members.filter(member => member.role !== 'guest'), [workspace.members]);

  const toggle = (id: string, set: React.Dispatch<React.SetStateAction<string[]>>) => set(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  const beginChannelEdit = (channel: Channel) => {
    setEditingChannelId(channel.id);
    setEditingDescription(channel.description);
    setEditingPrivate(channel.private);
    setEditingMemberIds(channel.memberIds);
  };

  return <Modal titleId="workspace-settings-title" onClose={onClose} className="settings-panel settings-large">
    <button className="close" onClick={onClose} aria-label="Close workspace settings"><X /></button>
    <span className="compose-icon"><Settings /></span>
    <h2 id="workspace-settings-title">Workspace settings</h2>
    <p>{usingCloud ? 'Cloud actions are enforced by Firestore rules as well as this role-aware interface.' : 'Demo mode is browser-local and explicitly separate from Firebase collaboration.'}</p>
    <div className="settings-row"><span><ShieldCheck /><b>Your role</b></span><strong>{roleLabel(currentRole)}</strong></div>
    <div className="settings-row"><span><Users /><b>Members</b></span><strong>{workspace.members.length}</strong></div>

    {canManage && <>
      <section className="settings-section">
        <div className="section-heading"><div><b>Invite a member</b><small>Invitations stay pending until the exact account accepts them.</small></div></div>
        <form className="invite-row" onSubmit={event => { event.preventDefault(); void Promise.resolve(onInvite(inviteEmail, inviteRole)).then(() => setInviteEmail('')); }}><input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" type="email" maxLength={254} required /><select value={inviteRole} onChange={event => setInviteRole(event.target.value as Exclude<Role, 'owner'>)}><option value="member">Member</option><option value="admin">Admin</option><option value="guest">Guest / viewer</option></select><button><UserPlus />Invite</button></form>
        <div className="member-list">{workspace.members.map(member => <div key={member.id}><span className="avatar">{member.initials}</span><span><b>{member.name}</b><small>{member.email}</small></span>{member.role === 'owner' ? <strong>Owner</strong> : <><select aria-label={`Role for ${member.name}`} value={member.role} onChange={event => void onRoleChange(member, event.target.value as Exclude<Role, 'owner'>)}><option value="admin">Admin</option><option value="member">Member</option><option value="guest">Guest</option></select><button type="button" onClick={() => { if (window.confirm(`Remove ${member.name} from this workspace?`)) void onRemoveMember(member); }} aria-label={`Remove ${member.name}`}><Trash2 /></button></>}</div>)}</div>
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><b>Channels</b><small>Private-channel content is readable only by managers and explicitly included members.</small></div></div>
        <form className="channel-builder" onSubmit={event => {
          event.preventDefault();
          void Promise.resolve(onCreateChannel({name: channelName, description: channelDescription, private: privateChannel, memberIds: privateChannel ? channelMemberIds : []})).then(() => {
            setChannelName(''); setChannelDescription(''); setPrivateChannel(false); setChannelMemberIds([]);
          });
        }}>
          <div className="channel-form"><input value={channelName} onChange={event => setChannelName(event.target.value)} maxLength={limits.channelName} placeholder="engineering" required /><input value={channelDescription} onChange={event => setChannelDescription(event.target.value)} maxLength={limits.channelDescription} placeholder="Channel description" /><button><Plus />Add</button></div>
          <label className="privacy-toggle"><input type="checkbox" checked={privateChannel} onChange={event => setPrivateChannel(event.target.checked)} /><LockKeyhole />Private channel</label>
          {privateChannel && <fieldset className="member-checks"><legend>Private members</legend>{selectableMembers.map(member => <label key={member.id}><input type="checkbox" checked={channelMemberIds.includes(member.id)} onChange={() => toggle(member.id, setChannelMemberIds)} />{member.name}</label>)}</fieldset>}
        </form>
        <div className="channel-admin-list">{workspace.channels.map(channel => <article key={channel.id}><div><b>{channel.private && <LockKeyhole />}#{channel.name}</b><small>{channel.description}</small></div>{editingChannelId === channel.id ? <div className="channel-edit"><input value={editingDescription} onChange={event => setEditingDescription(event.target.value)} maxLength={limits.channelDescription} /><label><input type="checkbox" checked={editingPrivate} onChange={event => setEditingPrivate(event.target.checked)} />Private</label>{editingPrivate && <fieldset className="member-checks"><legend>Private members</legend>{selectableMembers.map(member => <label key={member.id}><input type="checkbox" checked={editingMemberIds.includes(member.id)} onChange={() => toggle(member.id, setEditingMemberIds)} />{member.name}</label>)}</fieldset>}<div className="modal-actions"><button className="secondary-button" onClick={() => setEditingChannelId(null)}>Cancel</button><button className="publish" onClick={() => { void Promise.resolve(onUpdateChannel(channel, {description: editingDescription, private: editingPrivate, memberIds: editingPrivate ? editingMemberIds : []})).then(() => setEditingChannelId(null)); }}>Save</button></div></div> : <button className="secondary-button" onClick={() => beginChannelEdit(channel)}>Edit</button>}</article>)}</div>
      </section>
    </>}

    {!usingCloud && <button className="reset-workspace" onClick={onReset}><RotateCcw />Reset demo workspace</button>}
  </Modal>;
}
