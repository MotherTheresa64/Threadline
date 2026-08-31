import type {Workspace} from './types';

const iso=(offsetMinutes:number)=>new Date(Date.now()-offsetMinutes*60_000).toISOString();

export function createDemoWorkspace():Workspace{
  const now=new Date().toISOString();
  return {
    id:'northstar-demo',
    name:'Northstar Labs',
    description:'A fictional product team using Threadline to keep decisions, discussions, and documentation connected.',
    ownerId:'demo-owner',
    ownerEmail:'jordan@northstar.example',
    memberEmails:['jordan@northstar.example','maya@northstar.example','avery@northstar.example','jamie@northstar.example'],
    adminEmails:['jordan@northstar.example','maya@northstar.example'],
    guestEmails:[],
    members:[
      {id:'demo-owner',name:'Jordan Blake',email:'jordan@northstar.example',initials:'JB',role:'owner',title:'Product Lead',joinedAt:iso(60*24*30)},
      {id:'demo-maya',name:'Maya Chen',email:'maya@northstar.example',initials:'MC',role:'admin',title:'Engineering Lead',joinedAt:iso(60*24*24)},
      {id:'demo-avery',name:'Avery Morgan',email:'avery@northstar.example',initials:'AM',role:'member',title:'Product Designer',joinedAt:iso(60*24*18)},
      {id:'demo-jamie',name:'Jamie Lee',email:'jamie@northstar.example',initials:'JL',role:'member',title:'Researcher',joinedAt:iso(60*24*12)}
    ],
    channels:[
      {id:'general',name:'general',description:'Workspace-wide announcements and shared context.',pinnedThreadIds:['pricing-limits'],pinnedDocumentIds:['workspace-handbook']},
      {id:'engineering',name:'engineering',description:'Architecture, implementation, incidents, and technical decisions.'},
      {id:'design',name:'design',description:'Product design, research, accessibility, and design-system discussions.'},
      {id:'product',name:'product',description:'Product strategy, customer needs, releases, and decisions.'}
    ],
    threads:[
      {
        id:'retry-policy',channelId:'engineering',title:'What should our API retry policy look like?',
        body:'We currently retry all 5xx responses with the same backoff. We should separate transient gateway failures from application errors and document which requests are safe to replay.',
        authorId:'demo-maya',authorName:'Maya Chen',authorEmail:'maya@northstar.example',initials:'MC',createdAt:iso(18),updatedAt:iso(6),tags:['api','reliability'],reactions:['jordan@northstar.example','avery@northstar.example'],savedBy:['jordan@northstar.example'],status:'resolved',boardStatus:'complete',views:86,
        resolution:'Client requests retry at most twice with exponential backoff and jitter. Retry-After is honored when present; longer recovery belongs in background jobs.',resolvedBy:'Jordan Blake',resolvedAt:iso(5),acceptedReplyId:'retry-r1',relatedDocumentIds:['api-resilience'],
        replies:[
          {id:'retry-r1',authorId:'demo-owner',authorName:'Jordan Blake',authorEmail:'jordan@northstar.example',initials:'JB',body:'Cap client retries at two, honor Retry-After, and push anything longer into the job layer so request latency stays predictable.',createdAt:iso(12),reactions:['maya@northstar.example','avery@northstar.example']},
          {id:'retry-r2',authorId:'demo-avery',authorName:'Avery Morgan',authorEmail:'avery@northstar.example',initials:'AM',body:'Please include user-facing copy for the cases where we stop retrying and require a manual action.',createdAt:iso(8),reactions:[]}
        ]
      },
      {
        id:'pricing-limits',channelId:'product',title:'Decision: simplify the free workspace limits',
        body:'Capturing the outcome from the pricing review so it remains easy to find. Free workspaces keep unlimited viewers and cap active editors at three.',
        authorId:'demo-jamie',authorName:'Jamie Lee',authorEmail:'jamie@northstar.example',initials:'JL',createdAt:iso(42),updatedAt:iso(31),tags:['decision','pricing'],reactions:['jordan@northstar.example','maya@northstar.example','avery@northstar.example'],savedBy:[],status:'resolved',boardStatus:'complete',views:132,
        resolution:'Free workspaces support unlimited viewers and up to three active editors.',resolvedBy:'Maya Chen',resolvedAt:iso(30),relatedDocumentIds:[],
        replies:[{id:'pricing-r1',authorId:'demo-avery',authorName:'Avery Morgan',authorEmail:'avery@northstar.example',initials:'AM',body:'This gives us a much clearer upgrade boundary to explain in-product.',createdAt:iso(31),reactions:['jamie@northstar.example']}]
      },
      {
        id:'accessibility-audit',channelId:'design',title:'Accessibility audit findings for workspace settings',
        body:'Keyboard navigation is solid overall. Focus restoration after dialogs and two icon-only actions still need correction before release.',
        authorId:'demo-avery',authorName:'Avery Morgan',authorEmail:'avery@northstar.example',initials:'AM',createdAt:iso(65),updatedAt:iso(65),tags:['a11y','design-system'],reactions:['maya@northstar.example'],savedBy:[],status:'discussion',boardStatus:'review',views:54,replies:[],relatedDocumentIds:[]
      },
      {
        id:'onboarding-research',channelId:'product',title:'Customer interview notes: onboarding week 34',
        body:'Three recurring themes: people understand projects quickly, invite teammates later than expected, and want examples before creating their first workflow.',
        authorId:'demo-jamie',authorName:'Jamie Lee',authorEmail:'jamie@northstar.example',initials:'JL',createdAt:iso(190),updatedAt:iso(190),tags:['research','onboarding'],reactions:[],savedBy:['jordan@northstar.example'],status:'open',boardStatus:'planned',views:70,replies:[],relatedDocumentIds:['onboarding-notes']
      }
    ],
    documents:[
      {id:'workspace-handbook',title:'Northstar workspace handbook',content:'## How we use Threadline\n\nStart a titled discussion when the answer should remain discoverable. Resolve decisions with a concise outcome. Move durable process or reference material into Documents and link the source discussion whenever possible.',channelId:'general',tags:['onboarding','process'],authorName:'Jordan Blake',authorEmail:'jordan@northstar.example',lastEditorName:'Jordan Blake',lastEditorEmail:'jordan@northstar.example',createdAt:iso(60*24*10),updatedAt:iso(60*24*2),relatedThreadIds:[],versions:[{id:'handbook-v1',title:'Northstar workspace handbook',content:'Use titled discussions for decisions and reference material.',editorName:'Jordan Blake',editorEmail:'jordan@northstar.example',createdAt:iso(60*24*10)}]},
      {id:'api-resilience',title:'API resilience guidelines',content:'## Retry policy\n\nClient requests may retry transient failures at most twice using exponential backoff with jitter. Honor `Retry-After` when supplied. Long-running recovery belongs in background jobs.\n\n## Source\n\nThis policy was produced from the retry-policy discussion.',channelId:'engineering',tags:['api','reliability'],authorName:'Maya Chen',authorEmail:'maya@northstar.example',lastEditorName:'Maya Chen',lastEditorEmail:'maya@northstar.example',createdAt:iso(60*24*4),updatedAt:iso(4),relatedThreadIds:['retry-policy'],versions:[{id:'api-v1',title:'API resilience guidelines',content:'Initial resilience notes.',editorName:'Maya Chen',editorEmail:'maya@northstar.example',createdAt:iso(60*24*4)}]},
      {id:'onboarding-notes',title:'Onboarding research synthesis',content:'## Week 34 themes\n\n1. New users understand projects quickly.\n2. They invite teammates later than expected.\n3. Examples reduce blank-state hesitation.',channelId:'product',tags:['research','onboarding'],authorName:'Jamie Lee',authorEmail:'jamie@northstar.example',lastEditorName:'Jamie Lee',lastEditorEmail:'jamie@northstar.example',createdAt:iso(180),updatedAt:iso(180),relatedThreadIds:['onboarding-research'],versions:[]}
    ],
    activity:[
      {id:'a1',type:'resolution',summary:'Resolved “What should our API retry policy look like?”',actorName:'Jordan Blake',createdAt:iso(5),targetId:'retry-policy'},
      {id:'a2',type:'document',summary:'Updated “API resilience guidelines”',actorName:'Maya Chen',createdAt:iso(4),targetId:'api-resilience'},
      {id:'a3',type:'resolution',summary:'Resolved the free workspace limits decision',actorName:'Maya Chen',createdAt:iso(30),targetId:'pricing-limits'},
      {id:'a4',type:'discussion',summary:'Started “Accessibility audit findings for workspace settings”',actorName:'Avery Morgan',createdAt:iso(65),targetId:'accessibility-audit'}
    ],
    notifications:[
      {id:'n1',recipientEmail:'jordan@northstar.example',text:'Maya Chen resolved the API retry policy discussion.',createdAt:iso(5),read:false,targetThreadId:'retry-policy'},
      {id:'n2',recipientEmail:'jordan@northstar.example',text:'API resilience guidelines were updated.',createdAt:iso(4),read:false,targetDocumentId:'api-resilience'}
    ],
    createdAt:now,
    updatedAt:now
  };
}
