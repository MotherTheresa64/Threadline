import {useEffect,useMemo,useRef,useState} from 'react';
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

const channels=['engineering','product','design','research','random'] as const;
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
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>localStorage.setItem(STORE,JSON.stringify(threads)),[threads]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(''),2200);
    return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();searchRef.current?.focus();
      }
      if(event.key==='Escape'&&detailOpen)closeDetail();
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[detailOpen]);
  useEffect(()=>{
    const id=window.location.hash.startsWith('#thread-')?window.location.hash.slice(8):'';
    if(id&&threads.some(thread=>thread.id===id)){
      setSelected(id);setScope('all');setDetailOpen(true);
    }
  },[]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let next=threads.filter(thread=>{
      const inScope=scope==='saved'?thread.saved:scope==='all'?true:thread.channel===channel;
      const matches=!q||`${thread.title} ${thread.body} ${thread.tags.join(' ')} ${thread.author}`.toLowerCase().includes(q);
      const feedMatch=feedMode!=='unanswered'||thread.replies.length===0;
      return inScope&&matches&&feedMatch;
    });
    if(feedMode==='popular')next=[...next].sort((a,b)=>(b.likes+b.views)-(a.likes+a.views));
    return next;
  },[threads,scope,channel,query,feedMode]);

  const active=visible.find(thread=>thread.id===selected)??threads.find(thread=>thread.id===selected)??visible[0];
  const heading=scope==='saved'?'saved':scope==='all'?'all':channel;
  const description=scope==='saved'
    ?'The discussions and decisions you wanted to keep close.'
    :scope==='all'
      ?'Everything your team has documented across the workspace.'
      :channel==='engineering'
        ?'Architecture, implementation, incidents, and useful technical context.'
        :'Shared context your team can find again later.';

  const toggleSave=(id:string)=>setThreads(current=>current.map(thread=>thread.id===id?{...thread,saved:!thread.saved}:thread));
  const like=(id:string)=>setThreads(current=>current.map(thread=>thread.id===id?{...thread,likes:thread.likes+1}:thread));
  const reply=(id:string,body:string)=>setThreads(current=>current.map(thread=>thread.id===id?{...thread,replies:[...thread.replies,{id:crypto.randomUUID(),author:'Noah Ragan',initials:'NR',time:'now',body}]}:thread));
  const openThread=(id:string)=>{
    setSelected(id);setDetailOpen(true);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#thread-${id}`);
  };
  const closeDetail=()=>{
    setDetailOpen(false);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}`);
  };
  const chooseChannel=(next:string)=>{
    setChannel(next);setScope('channel');setFeedMode('latest');setMobileNav(false);closeDetail();
  };
  const changeScope=(next:Scope)=>{
    setScope(next);setFeedMode('latest');setMobileNav(false);closeDetail();
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
        <button onClick={()=>setToast('No inbox workflow is connected in demo mode')}><Inbox/><span>Inbox</span></button>
        <button onClick={()=>changeScope('saved')}><Bookmark/><span>Saved</span></button>
        <button onClick={()=>changeScope('all')}><Compass/><span>Explore</span></button>
      </nav>
      <div className="nav-head">Channels <Plus size={14}/></div>
      <div className="channels">
        <button className={scope==='all'?'active':''} onClick={()=>changeScope('all')}><Hash/>all threads<b>{threads.length}</b></button>
        {channels.map(item=>{
          const count=threads.filter(thread=>thread.channel===item).length;
          return <button className={scope==='channel'&&channel===item?'active':''} key={item} onClick={()=>chooseChannel(item)}><Hash/>{item}{count>0&&<b>{count}</b>}</button>;
        })}
      </div>
      <div className="people">
        <div className="nav-head">Online now <span>4</span></div>
        {[['MC','Maya'],['AM','Avery'],['JL','Jamie']].map(([initials,name])=><div key={initials}><span className="avatar">{initials}<i/></span>{name}</div>)}
      </div>
      <button className="settings" onClick={()=>setToast('Workspace settings are available after backend setup')}><Settings/>Workspace settings</button>
    </aside>

    <main className="feed">
      <header>
        <button className="mobile" onClick={()=>setMobileNav(value=>!value)} aria-label="Toggle workspace navigation"><PanelLeft/></button>
        <div className="search"><Search/><input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search conversations, decisions, people…" aria-label="Search threads"/><kbd>⌘ K</kbd></div>
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
        {visible.map(thread=><article key={thread.id} className={active?.id===thread.id?'thread selected':'thread'}>
          <button className="thread-open-overlay" onClick={()=>openThread(thread.id)} aria-label={`Open thread: ${thread.title}`}/>
          <div className={`avatar big a${thread.initials.charCodeAt(0)%4}`}>{thread.initials}</div>
          <div>
            <div className="thread-meta"><b>{thread.author}</b><span>{thread.time} ago · #{thread.channel}</span>{thread.solved&&<em><CheckCircle2/>Resolved</em>}</div>
            <h2>{thread.title}</h2><p>{thread.body}</p>
            <div className="tags">{thread.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
            <div className="stats"><span><ThumbsUp/>{thread.likes}</span><span><MessageSquare/>{thread.replies.length}</span><span><Clock3/>{thread.views} views</span></div>
          </div>
          <button className={thread.saved?'save saved':'save'} aria-label={thread.saved?'Remove from saved':'Save thread'} onClick={()=>toggleSave(thread.id)}><Bookmark/></button>
        </article>)}
      </div>
    </main>

    <aside className={detailOpen?'detail detail-open':'detail'} aria-label="Thread details">
      <button className="detail-close" onClick={closeDetail} aria-label="Close thread details"><X/></button>
      {active?<ThreadDetail thread={active} onLike={()=>like(active.id)} onSave={()=>toggleSave(active.id)} onReply={body=>{reply(active.id,body);setToast('Reply posted')}} onToast={setToast}/>:<div className="empty">No thread selected.</div>}
    </aside>

    {composer&&<Composer channel={scope==='channel'?channel:'engineering'} onClose={()=>setComposer(false)} onCreate={thread=>{setThreads(current=>[thread,...current]);setSelected(thread.id);setChannel(thread.channel);setScope('channel');setFeedMode('latest');setComposer(false);setDetailOpen(true);window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#thread-${thread.id}`);setToast('Thread published')}}/>}
    {toast&&<div className="toast"><CheckCircle2/>{toast}</div>}
  </div>
}

function ThreadDetail({thread,onLike,onSave,onReply,onToast}:{thread:Thread;onLike:()=>void;onSave:()=>void;onReply:(body:string)=>void;onToast:(message:string)=>void}){
  const [body,setBody]=useState('');
  const copyLink=async()=>{
    const url=`${window.location.origin}${window.location.pathname}${window.location.search}#thread-${thread.id}`;
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
    <div className="replies">{thread.replies.slice().reverse().map(item=><article key={item.id}><span className="avatar">{item.initials}</span><div><b>{item.author}<small>{item.time} ago</small></b><p>{item.body}</p><button type="button"><ThumbsUp/>Helpful</button></div></article>)}</div>
    <form className="reply-box" onSubmit={event=>{event.preventDefault();if(body.trim()){onReply(body.trim());setBody('')}}}>
      <span className="avatar nr">NR</span><div><textarea value={body} onChange={event=>setBody(event.target.value)} placeholder="Add useful context…" aria-label="Reply text"/><div><span>Markdown supported</span><button><Send/>Reply</button></div></div>
    </form>
  </div>
}

function Composer({channel,onClose,onCreate}:{channel:string;onClose:()=>void;onCreate:(thread:Thread)=>void}){
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [selectedChannel,setSelectedChannel]=useState(channel);
  const [tags,setTags]=useState('');
  return <div className="overlay" onMouseDown={onClose}>
    <form className="composer" onMouseDown={event=>event.stopPropagation()} onSubmit={event=>{event.preventDefault();if(title.trim()&&body.trim())onCreate({id:crypto.randomUUID(),channel:selectedChannel,title:title.trim(),body:body.trim(),author:'Noah Ragan',initials:'NR',time:'now',tags:tags.split(',').map(tag=>tag.trim()).filter(Boolean),likes:0,views:1,saved:false,replies:[]})}}>
      <button type="button" className="close" onClick={onClose} aria-label="Close composer"><X/></button>
      <span className="compose-icon"><Sparkles/></span><h2>Start a useful thread</h2><p>Ask a question, document a decision, or leave context future-you will be glad to find.</p>
      <label>Title<input autoFocus required value={title} onChange={event=>setTitle(event.target.value)} placeholder="What should people know?"/></label>
      <label>Channel<select value={selectedChannel} onChange={event=>setSelectedChannel(event.target.value)}>{channels.map(item=><option key={item}>{item}</option>)}</select></label>
      <label>Details<textarea required value={body} onChange={event=>setBody(event.target.value)} placeholder="Add enough context for someone who wasn't in the room…"/></label>
      <label>Tags<input value={tags} onChange={event=>setTags(event.target.value)} placeholder="api, reliability, decision"/></label>
      <button className="publish"><Send/>Publish thread</button>
    </form>
  </div>
}
