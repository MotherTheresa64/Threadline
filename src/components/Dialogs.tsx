import {useState} from 'react';
import {Check,FileText,Plus,RotateCcw,Send,Settings,ShieldCheck,Sparkles,Trash2,UserPlus,Users,X} from 'lucide-react';
import type {CurrentUser,Discussion,KnowledgeDocument,Member,Role,Workspace} from '../types';

const normalizeEmail=(email:string)=>email.trim().toLowerCase();
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'TL';

export function DiscussionComposer({ workspace, currentUser, defaultChannel, onClose, onCreate }: {
    workspace: Workspace;
    currentUser: CurrentUser;
    defaultChannel: string;
    onClose: () => void;
    onCreate: (thread: Discussion) => void;
}) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [channelId, setChannelId] = useState(workspace.channels.some(item => item.id === defaultChannel) ? defaultChannel : workspace.channels[0]?.id || 'general');
    const [tags, setTags] = useState('');
    return <div className="overlay" onMouseDown={onClose}><form className="composer" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (!title.trim() || !body.trim())
        return; const now = new Date().toISOString(); onCreate({ id: crypto.randomUUID(), channelId, title: title.trim(), body: body.trim(), authorId: currentUser.id, authorName: currentUser.name, authorEmail: normalizeEmail(currentUser.email), initials: currentUser.initials, createdAt: now, updatedAt: now, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), replies: [], reactions: [], savedBy: [], status: 'open', boardStatus: 'backlog', relatedDocumentIds: [], views: 1 }); }}><button type="button" className="close" onClick={onClose}><X /></button><span className="compose-icon"><Sparkles /></span><h2>Start a useful discussion</h2><p>Give the conversation a title so somebody can understand and find it months from now.</p><label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="What are we deciding or trying to understand?" required/></label><label>Channel<select value={channelId} onChange={event => setChannelId(event.target.value)}>{workspace.channels.map(channel => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</select></label><label>Context<textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Add enough context for someone who was not in the room…" required/></label><label>Tags<input value={tags} onChange={event => setTags(event.target.value)} placeholder="decision, api, onboarding"/></label><button className="publish"><Send />Publish discussion</button></form></div>;
}
export function DocumentEditor({ workspace, currentUser, document, onClose, onSave }: {
    workspace: Workspace;
    currentUser: CurrentUser;
    document: KnowledgeDocument | null;
    onClose: () => void;
    onSave: (document: KnowledgeDocument) => void;
}) {
    const [title, setTitle] = useState(document?.title || '');
    const [content, setContent] = useState(document?.content || '');
    const [channelId, setChannelId] = useState(document?.channelId || workspace.channels[0]?.id || 'general');
    const [tags, setTags] = useState(document?.tags.join(', ') || '');
    const [related, setRelated] = useState(document?.relatedThreadIds[0] || '');
    return <div className="overlay" onMouseDown={onClose}><form className="composer document-composer" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (!title.trim() || !content.trim())
        return; const now = new Date().toISOString(); onSave({ id: document?.id || crypto.randomUUID(), title: title.trim(), content: content.trim(), channelId, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), authorName: document?.authorName || currentUser.name, authorEmail: document?.authorEmail || normalizeEmail(currentUser.email), lastEditorName: currentUser.name, lastEditorEmail: normalizeEmail(currentUser.email), createdAt: document?.createdAt || now, updatedAt: now, versions: document?.versions || [], relatedThreadIds: related ? [related] : document?.relatedThreadIds || [] }); }}><button type="button" className="close" onClick={onClose}><X /></button><span className="compose-icon"><FileText /></span><h2>{document ? 'Edit knowledge document' : 'Create knowledge document'}</h2><p>Store durable information here and connect it back to the discussion that produced it.</p><label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} required/></label><label>Channel<select value={channelId} onChange={event => setChannelId(event.target.value)}>{workspace.channels.map(channel => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</select></label><label>Content<textarea className="document-textarea" value={content} onChange={event => setContent(event.target.value)} placeholder="Use clear headings and durable context…" required/></label><label>Tags<input value={tags} onChange={event => setTags(event.target.value)} placeholder="process, onboarding, reference"/></label><label>Source discussion<select value={related} onChange={event => setRelated(event.target.value)}><option value="">None</option>{workspace.threads.map(thread => <option key={thread.id} value={thread.id}>{thread.title}</option>)}</select></label><button className="publish"><Send />Save document</button></form></div>;
}
export function WorkspacePanel({ workspaces, activeId, onChoose, onClose, onCreate }: {
    workspaces: Workspace[];
    activeId: string;
    onChoose: (id: string) => void;
    onClose: () => void;
    onCreate: (name: string, description: string) => void;
}) {
    const [creating, setCreating] = useState(workspaces.length === 0);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    return <div className="overlay" onMouseDown={onClose}><section className="settings-panel workspace-panel" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={onClose}><X /></button><span className="compose-icon"><Users /></span><h2>Workspaces</h2><p>Keep companies, teams, organizations, and projects isolated from each other.</p><div className="workspace-list">{workspaces.map(workspace => <button key={workspace.id} className={workspace.id === activeId ? 'active' : ''} onClick={() => onChoose(workspace.id)}><span className="avatar">{workspace.name.slice(0, 2).toUpperCase()}</span><span><b>{workspace.name}</b><small>{workspace.description || `${workspace.members.length} members`}</small></span>{workspace.id === activeId && <Check />}</button>)}</div>{creating ? <form className="inline-form" onSubmit={event => { event.preventDefault(); if (name.trim())
        onCreate(name, description); }}><label>Name<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Acme Product Team" required/></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this workspace for?"/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancel</button><button className="publish"><Plus />Create workspace</button></div></form> : <button className="wide-secondary" onClick={() => setCreating(true)}><Plus />Create another workspace</button>}</section></div>;
}
export function WorkspaceSettings({ workspace, currentUser, canManage, usingCloud, onClose, onUpdate, onReset }: {
    workspace: Workspace;
    currentUser: CurrentUser;
    canManage: boolean;
    usingCloud: boolean;
    onClose: () => void;
    onUpdate: (updater: (workspace: Workspace) => Workspace, message?: string) => void;
    onReset: () => void;
}) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('member');
    const [channelName, setChannelName] = useState('');
    const [channelDescription, setChannelDescription] = useState('');
    const invite = () => { const email = normalizeEmail(inviteEmail); if (!email || !email.includes('@'))
        return; onUpdate(draft => { if (draft.memberEmails.includes(email))
        return draft; draft.memberEmails.push(email); if (inviteRole === 'admin')
        draft.adminEmails.push(email); if (inviteRole === 'guest')
        draft.guestEmails.push(email); draft.members.push({ id: `pending-${crypto.randomUUID()}`, name: email.split('@')[0], email, initials: initials(email.split('@')[0]), role: inviteRole, joinedAt: new Date().toISOString() }); draft.activity.unshift({ id: crypto.randomUUID(), type: 'member', summary: `Invited ${email} as ${inviteRole}`, actorName: currentUser.name, createdAt: new Date().toISOString() }); return draft; }, `Invited ${email}`); setInviteEmail(''); };
    const removeMember = (member: Member) => { if (member.role === 'owner' || !window.confirm(`Remove ${member.email} from this workspace?`))
        return; onUpdate(draft => { draft.memberEmails = draft.memberEmails.filter(email => email !== member.email); draft.adminEmails = draft.adminEmails.filter(email => email !== member.email); draft.guestEmails = draft.guestEmails.filter(email => email !== member.email); draft.members = draft.members.filter(item => item.email !== member.email); return draft; }, 'Member removed'); };
    const addChannel = () => { const name = channelName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); if (!name)
        return; onUpdate(draft => { if (!draft.channels.some(channel => channel.name === name))
        draft.channels.push({ id: `${name}-${crypto.randomUUID().slice(0, 4)}`, name, description: channelDescription.trim() || 'Shared workspace discussion.' }); return draft; }, 'Channel created'); setChannelName(''); setChannelDescription(''); };
    return <div className="overlay" onMouseDown={onClose}><section className="settings-panel settings-large" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={onClose}><X /></button><span className="compose-icon"><Settings /></span><h2>Workspace settings</h2><p>{usingCloud ? 'Changes are shared through Firestore and workspace access is enforced by membership rules.' : 'Demo mode stores changes in this browser. Sign in after Firebase is configured to collaborate across accounts.'}</p><div className="settings-row"><span><ShieldCheck /><b>Your role</b></span><strong>{workspace.members.find(member => member.email === normalizeEmail(currentUser.email))?.role || 'guest'}</strong></div><div className="settings-row"><span><Users /><b>Members</b></span><strong>{workspace.members.length}</strong></div>{canManage && <><section className="settings-section"><div className="section-heading"><div><b>Invite a member</b><small>Invite by email. Signed-in users with that email can access this workspace.</small></div></div><div className="invite-row"><input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" type="email"/><select value={inviteRole} onChange={event => setInviteRole(event.target.value as Role)}><option value="member">Member</option><option value="admin">Admin</option><option value="guest">Guest / viewer</option></select><button onClick={invite}><UserPlus />Invite</button></div><div className="member-list">{workspace.members.map(member => <div key={member.email}><span className="avatar">{member.initials}</span><span><b>{member.name}</b><small>{member.email} · {member.role}</small></span>{member.role !== 'owner' && <button onClick={() => removeMember(member)} aria-label={`Remove ${member.name}`}><Trash2 /></button>}</div>)}</div></section><section className="settings-section"><div className="section-heading"><div><b>Create a channel</b><small>Use channels to group related discussions and knowledge.</small></div></div><div className="channel-form"><input value={channelName} onChange={event => setChannelName(event.target.value)} placeholder="engineering"/><input value={channelDescription} onChange={event => setChannelDescription(event.target.value)} placeholder="Channel description"/><button onClick={addChannel}><Plus />Add</button></div></section></>}{!usingCloud && <button className="reset-workspace" onClick={onReset}><RotateCcw />Reset demo workspace</button>}</section></div>;
}
