import {useEffect,useMemo,useState} from 'react';
import {
  Search,Plus,Hash,Inbox,Bookmark,Compass,Settings,Bell,ChevronDown,
  MessageSquare,CheckCircle2,ThumbsUp,Reply,MoreHorizontal,PanelLeft,
  PenLine,Clock3,Sparkles,X,Send,Link2
} from 'lucide-react';
import {firebaseReady,signInGoogle} from './firebase';

type ReplyT={id:string;author:string;initials:string;time:string;body:string};
type Thread={
  id:string;channel:string;title:string;body:string;author:string;initials:string;
  time:string;tags:string[];replies:ReplyT[];likes:number;views:number;saved:boolean;solved?:boolean
};
type Scope='channel'|'saved'|'all';
type FeedMode='latest'|'popular'|'unanswered';

const seed:Thread[]=[
  {id:'1',channel:'engineering',title:'What should our API retry policy look like?',body:'We currently retry all 5xx responses with the same backoff. I think we should separate transient gateway failures from application errors and add jitter before this goes into the mobile release.',author:'Maya Chen',initials:'MC',time:'18m',tags:['api','reliability'],likes:14,views:86,saved:true,solved:true,replies:[{id:'r1',author:'Alex Rivera',initials:'AR',time:'12m',body:'I would cap client retries at 2 and move any longer retry strategy to the job layer. That keeps request latency predictable.'},{id:'r2',author:'Noah Ragan',initials:'NR',time:'6m',body:'Agreed. We can also honor Retry-After when upstream gives us one and document which error classes are safe to replay.'}]},
  {id:'2',channel:'product',title:'Decision: simplify the free workspace limits',body:'Posting the outcome from today’s pricing review so we have one durable source of truth. Free workspaces will keep unlimited viewers and cap active editors at three.',author:'Jamie Lee',initials:'JL',time:'42m',tags:['decision','pricing'],likes:21,views:132,saved:false,solved:true,replies:[{id:'r3',author:'Noah Ragan',initials:'NR',time:'31m',body:'This makes the upgrade boundary a lot easier to explain in-product. I’ll update the empty state copy.'}]},
  {id:'3',channel:'design',title:'Small accessibility audit findings',body:'I ran a keyboard-only pass on the settings area. Most flows are solid, but modal focus restoration and two icon-only actions need attention before release.',author:'Avery Morgan',initials:'AM',time:'1h',tags:['a11y','design-system'],likes:9,views:54,saved:false,replies:[]},
  {id:'4',channel:'engineering',title:'Patterns for optimistic updates with rollback',body:'Collecting examples of where we already use optimistic UI successfully and where we should avoid it. Comments and reactions feel safe; billing settings probably do not.',author:'Noah Ragan',initials:'NR',time:'2h',tags:['frontend','architecture'],likes:18,views:110,saved:true,replies:[{id:'r4',author:'Maya Chen',initials:'MC',time:'1h',body:'A small mutation state machine would make rollback behavior consistent without tying us to a specific data library.'}]},
  {id:'5',channel:'research',title:'Customer interview notes: onboarding week 34',body:'Three recurring themes this week: people understand projects quickly, invite teammates later than expected, and want examples before creating their first workflow.',author:'Sam Kim',initials:'SK',time:'3h',tags:['research','onboarding'],likes:11,views:70,saved:false,replies:[]}
];

const channels=[['engineering',12],['product',6],['design',4],['research',3],['random',0]] as const;
const STORE='threadline-v1';

function readThreads():Thread[]{
  try{
    const parsed=JSON.parse(localStorage.getItem(STORE)||'null');
    return Array.isArray(parsed)?parsed:seed;
  }catch{return seed}
}

export default function App(){
  const [threads,setThreads]=useState<Thread[]>(readThreads);
  const [selected,setSelected]=useState('1');
  const [channel,setChannel]=useState('engineering');
  const [scope,setScope]=useState<Scope>('channel');
  const [feedMode,setFeedMode]=useState<FeedMode>('latest');
  const [query,setQuery]=useState('');
  const [composer,setComposer]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const [detailOpen,setDetailOpen]=useState(false);
  const [toast,setToast]=useState('');

  useEffect(()=>localStorage.setItem(STORE,JSON.stringify(threads)),[threads]);
  useEffect(()=>{
    if(!toast)return;
    const t=setTimeout(()=>setToast(''),2200);
    return()=>clearTimeout(t);
  },[toast]);
  useEffect(()=>{
    if(!detailOpen)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setDetailOpen(false)};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[detailOpen]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let next=threads.filter(t=>{
      const inScope=scope==='saved'?t.saved:scope==='all'?true:t.channel===channel;
      const matches=!q||`${t.title} ${t.body} ${t.tags.join(' ')} ${t.author}`.toLowerCase().includes(q);
      const feedMatch=feedMode!=='unanswered'||t.replies.length===0;
      return inScope&&matches&&feedMatch;
    });
    if(feedMode==='popular')next=[...next].sort((a,b)=>(b.likes+b.views)-(a.likes+a.views));
    return next;
  },[threads,scope,channel,query,feedMode]);

  const active=visible.find(t=>t.id===selected)??visible[0];
  const heading=scope==='saved'?'saved':scope==='all'?'all':channel;
  const description=scope==='saved'
    ?'The discussions and decisions you wanted to keep close.'
    :scope==='all'
      ?'Everything your team has documented across the workspace.'
      :channel==='engineering'
        ?'Architecture, implementation, incidents, and useful technical context.'
        :'Shared context your team can find again later.';

  const toggleSave=(id:string)=>setThreads(v=>v.map(t=>t.id===id?{...t,saved:!t.saved}:t));
  const like=(id:string)=>setThreads(v=>v.map(t=>t.id===id?{...t,likes:t.likes+1}:t));
  const reply=(id:string,body:string)=>setThreads(v=>v.map(t=>t.id===id?{...t,replies:[...t.replies,{id:crypto.randomUUID(),author:'Noah Ragan',initials:'NR',time:'now',body}]}:t));
  const openThread=(id:string)=>{setSelected(id);setDetailOpen(true)};

  const chooseChannel=(next:string)=>{
    setChannel(next);setScope('channel');setFeedMode('latest');setMobileNav(false);setDetailOpen(false);
  };

  const signIn=async()=>{
    if(!firebaseReady){setToast('Demo mode — add Firebase keys to enable Google sign-in');return}
    try{await signInGoogle();setToast('Signed in with Google')}
    catch{setToast('Google sign-in was cancelled or unavailable')}
  };

  return <div className="shell">
    <aside className={mobileNav?'rail open':'rail'}>
      <div className="logo"><span>t</span>threadline</div>
      <button className="workspace" onClick={signIn} title={firebaseReady?'Sign in with Google':'Running in demo mode'}>
        <span className="avatar nr">NR</span>
        <span><b>Northstar Labs</b><small>{firebaseReady?'Google sign-in ready':'Demo workspace · 8 members'}</small></span>
        <ChevronDown size={15}/>
      </button>
      <nav>
        <button onClick={()=>setToast('Inbox is clear in this demo')}><Inbox/><span>Inbox</span><b>7</b></button>
        <button onClick={()=>{setScope('saved');setFeedMode('latest');setMobileNav(false);setDetailOpen(false)}}><Bookmark/><span>Saved</span></button>
        <button onClick={()=>{setScope('all');setFeedMode('latest');setMobileNav(false);setDetailOpen(false)}}><Compass/><span>Explore</span></button>
      </nav>
      <div className="nav-head">Channels <Plus size={14}/></div>
      <div className="channels">
        <button className={scope==='all'?'active':''} onClick={()=>{setScope('all');setFeedMode('latest');setMobileNav(false);setDetailOpen(false)}}><Hash/>all threads</button>
        {channels.map(([c,n])=><button className={scope==='channel'&&channel===c?'active':''} key={c} onClick={()=>chooseChannel(c)}><Hash/>{c}{n>0&&<b>{n}</b>}</button>)}
      </div>
      <div className="people">
        <div className="nav-head">Online now <span>4</span></div>
        {[['MC','Maya'],['AM','Avery'],['JL','Jamie']].map(([a,n])=><div key={a}><span className="avatar">{a}<i/></span>{n}</div>)}
      </div>
      <button className="settings" onClick={()=>setToast('Workspace settings are available after backend setup')}><Settings/>Workspace settings</button>
    </aside>

    <main className="feed">
      <header>
        <button className="mobile" onClick={()=>setMobileNav(v=>!v)} aria-label="Toggle workspace navigation"><PanelLeft/></button>
        <div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations, decisions, people…" aria-label="Search threads"/><kbd>⌘ K</kbd></div>
        <button className="bell" onClick={()=>setToast('No new notifications')} aria-label="Notifications"><Bell/><i/></button>
        <button className="new" onClick={()=>setComposer(true)}><PenLine/>New thread</button>
      </header>

      <section className="feed-head">
        <div><span className="eyebrow">Workspace discussions</span><h1>#{heading}</h1><p>{description}</p></div>
        <div className="faces"><span>MC</span><span>AR</span><span>NR</span><b>+5</b></div>
      </section>

      <div className="filters">
        {(['latest','popular','unanswered'] as FeedMode[]).map(mode=><button key={mode} className={feedMode===mode?'active':''} onClick={()=>setFeedMode(mode)}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}
        <span>{visible.length} {visible.length===1?'thread':'threads'}</span>
      </div>

      <div className="thread-list">
        {visible.length===0&&<div className="empty">No threads match this view.</div>}
        {visible.map(t=><article
          key={t.id}
          className={active?.id===t.id?'thread selected':'thread'}
          role="button"
          tabIndex={0}
          onClick={()=>openThread(t.id)}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openThread(t.id)}}}
          aria-label={`Open thread: ${t.title}`}
        >
          <div className={`avatar big a${t.initials.charCodeAt(0)%4}`}>{t.initials}</div>
          <div>
            <div className="thread-meta"><b>{t.author}</b><span>{t.time} ago · #{t.channel}</span>{t.solved&&<em><CheckCircle2/>Resolved</em>}</div>
            <h2>{t.title}</h2><p>{t.body}</p>
            <div className="tags">{t.tags.map(x=><span key={x}>{x}</span>)}</div>
            <div className="stats"><span><ThumbsUp/>{t.likes}</span><span><MessageSquare/>{t.replies.length}</span><span><Clock3/>{t.views} views</span></div>
          </div>
          <button className={t.saved?'save saved':'save'} aria-label={t.saved?'Remove from saved':'Save thread'} onClick={e=>{e.stopPropagation();toggleSave(t.id)}}><Bookmark/></button>
        </article>)}
      </div>
    </main>

    <aside className={detailOpen?'detail detail-open':'detail'} aria-label="Thread details">
      <button className="detail-close" onClick={()=>setDetailOpen(false)} aria-label="Close thread details"><X/></button>
      {active?<ThreadDetail thread={active} onLike={()=>like(active.id)} onSave={()=>toggleSave(active.id)} onReply={b=>{reply(active.id,b);setToast('Reply posted')}} onToast={setToast}/>:<div className="empty">No thread selected.</div>}
    </aside>

    {composer&&<Composer channel={scope==='channel'?channel:'engineering'} onClose={()=>setComposer(false)} onCreate={t=>{setThreads(v=>[t,...v]);setSelected(t.id);setChannel(t.channel);setScope('channel');setFeedMode('latest');setComposer(false);setDetailOpen(true);setToast('Thread published')}}/>}
    {toast&&<div className="toast"><CheckCircle2/>{toast}</div>}
  </div>
}

function ThreadDetail({thread,onLike,onSave,onReply,onToast}:{thread:Thread;onLike:()=>void;onSave:()=>void;onReply:(b:string)=>void;onToast:(m:string)=>void}){
  const [body,setBody]=useState('');
  const copyLink=async()=>{
    const url=`${window.location.origin}${window.location.pathname}#thread-${thread.id}`;
    try{await navigator.clipboard.writeText(url);onToast('Thread link copied')}
    catch{onToast('Copy failed — your browser blocked clipboard access')}
  };
  return <div className="detail-inner">
    <div className="detail-top"><span>Thread</span><div><button onClick={onSave} className={thread.saved?'active':''} aria-label="Save thread"><Bookmark/></button><button aria-label="More thread options"><MoreHorizontal/></button></div></div>
    <div className="author"><span className="avatar big">{thread.initials}</span><div><b>{thread.author}</b><small>#{thread.channel} · {thread.time} ago</small></div></div>
    <h2>{thread.title}</h2><p className="body">{thread.body}</p>
    <div className="detail-actions"><button onClick={onLike}><ThumbsUp/>{thread.likes}</button><button onClick={()=>onToast('Reply box is ready below')}><Reply/>Reply</button><button onClick={copyLink}><Link2/>Copy link</button></div>
    {thread.solved&&<div className="resolved"><CheckCircle2/><div><b>Marked as resolved</b><span>This thread contains a confirmed answer or decision.</span></div></div>}
    <div className="reply-head"><b>{thread.replies.length} {thread.replies.length===1?'reply':'replies'}</b><span>Newest first</span></div>
    <div className="replies">{thread.replies.slice().reverse().map(r=><article key={r.id}><span className="avatar">{r.initials}</span><div><b>{r.author}<small>{r.time} ago</small></b><p>{r.body}</p><button type="button"><ThumbsUp/>Helpful</button></div></article>)}</div>
    <form className="reply-box" onSubmit={e=>{e.preventDefault();if(body.trim()){onReply(body.trim());setBody('')}}}>
      <span className="avatar nr">NR</span><div><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Add useful context…" aria-label="Reply text"/><div><span>Markdown supported</span><button><Send/>Reply</button></div></div>
    </form>
  </div>
}

function Composer({channel,onClose,onCreate}:{channel:string;onClose:()=>void;onCreate:(t:Thread)=>void}){
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [ch,setCh]=useState(channel);
  const [tags,setTags]=useState('');
  return <div className="overlay" onMouseDown={onClose}>
    <form className="composer" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(title.trim()&&body.trim())onCreate({id:crypto.randomUUID(),channel:ch,title:title.trim(),body:body.trim(),author:'Noah Ragan',initials:'NR',time:'now',tags:tags.split(',').map(x=>x.trim()).filter(Boolean),likes:0,views:1,saved:false,replies:[]})}}>
      <button type="button" className="close" onClick={onClose} aria-label="Close composer"><X/></button>
      <span className="compose-icon"><Sparkles/></span><h2>Start a useful thread</h2><p>Ask a question, document a decision, or leave context future-you will be glad to find.</p>
      <label>Title<input autoFocus required value={title} onChange={e=>setTitle(e.target.value)} placeholder="What should people know?"/></label>
      <label>Channel<select value={ch} onChange={e=>setCh(e.target.value)}>{channels.map(([c])=><option key={c}>{c}</option>)}</select></label>
      <label>Details<textarea required value={body} onChange={e=>setBody(e.target.value)} placeholder="Add enough context for someone who wasn't in the room…"/></label>
      <label>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="api, reliability, decision"/></label>
      <button className="publish"><Send/>Publish thread</button>
    </form>
  </div>
}
