import type {Workspace} from './types';

const iso = (offsetMinutes: number) => new Date(Date.now() - offsetMinutes * 60_000).toISOString();

export function createDemoWorkspace(): Workspace {
  const now = new Date().toISOString();
  return {
    id: 'northstar-demo',
    name: 'Northstar Labs',
    description: 'A fictional product team using Threadline to keep discussions, decisions, and documentation connected.',
    ownerId: 'demo-owner',
    ownerEmail: 'jordan@northstar.example',
    members: [
      {id: 'demo-owner', name: 'Jordan Blake', email: 'jordan@northstar.example', initials: 'JB', role: 'owner', title: 'Product Lead', joinedAt: iso(60 * 24 * 30), status: 'active'},
      {id: 'demo-maya', name: 'Maya Chen', email: 'maya@northstar.example', initials: 'MC', role: 'admin', title: 'Engineering Lead', joinedAt: iso(60 * 24 * 24), status: 'active'},
      {id: 'demo-avery', name: 'Avery Morgan', email: 'avery@northstar.example', initials: 'AM', role: 'member', title: 'Product Designer', joinedAt: iso(60 * 24 * 18), status: 'active'},
      {id: 'demo-jamie', name: 'Jamie Lee', email: 'jamie@northstar.example', initials: 'JL', role: 'member', title: 'Researcher', joinedAt: iso(60 * 24 * 12), status: 'active'},
    ],
    channels: [
      {id: 'general', name: 'general', description: 'Workspace-wide announcements and shared context.', private: false, memberIds: []},
      {id: 'engineering', name: 'engineering', description: 'Architecture, implementation, incidents, and technical decisions.', private: false, memberIds: []},
      {id: 'design', name: 'design', description: 'Product design, research, accessibility, and design-system discussions.', private: false, memberIds: []},
      {id: 'product', name: 'product', description: 'Product strategy, customer needs, releases, and decisions.', private: false, memberIds: []},
      {id: 'launch-room', name: 'launch-room', description: 'Private launch coordination for workspace leads.', private: true, memberIds: ['demo-owner', 'demo-maya']},
    ],
    threads: [
      {
        id: 'retry-policy', workspaceId: 'northstar-demo', channelId: 'engineering', title: 'What should our API retry policy look like?',
        body: 'We currently retry all 5xx responses with the same backoff. We should separate transient gateway failures from application errors and document which requests are safe to replay.',
        authorId: 'demo-maya', authorName: 'Maya Chen', authorEmail: 'maya@northstar.example', initials: 'MC', createdAt: iso(18), updatedAt: iso(6), tags: ['api', 'reliability'], reactions: ['jordan@northstar.example', 'avery@northstar.example'], savedBy: ['jordan@northstar.example'], status: 'resolved', boardStatus: 'complete', views: 86,
        resolution: 'Client requests retry at most twice with exponential backoff and jitter. Retry-After is honored when present; longer recovery belongs in background jobs.', resolvedBy: 'Jordan Blake', resolvedById: 'demo-owner', resolvedAt: iso(5), acceptedReplyId: 'retry-r1', relatedDocumentIds: ['api-resilience'],
        replies: [
          {id: 'retry-r1', workspaceId: 'northstar-demo', channelId: 'engineering', threadId: 'retry-policy', authorId: 'demo-owner', authorName: 'Jordan Blake', authorEmail: 'jordan@northstar.example', initials: 'JB', body: 'Cap client retries at two, honor Retry-After, and push anything longer into the job layer so request latency stays predictable.', createdAt: iso(12), reactions: ['maya@northstar.example', 'avery@northstar.example']},
          {id: 'retry-r2', workspaceId: 'northstar-demo', channelId: 'engineering', threadId: 'retry-policy', authorId: 'demo-avery', authorName: 'Avery Morgan', authorEmail: 'avery@northstar.example', initials: 'AM', body: 'Please include user-facing copy for the cases where we stop retrying and require a manual action.', createdAt: iso(8), reactions: []},
        ],
      },
      {
        id: 'pricing-limits', workspaceId: 'northstar-demo', channelId: 'product', title: 'Decision: simplify the free workspace limits',
        body: 'Capturing the outcome from the pricing review so it remains easy to find. Free workspaces keep unlimited viewers and cap active editors at three.',
        authorId: 'demo-jamie', authorName: 'Jamie Lee', authorEmail: 'jamie@northstar.example', initials: 'JL', createdAt: iso(42), updatedAt: iso(31), tags: ['decision', 'pricing'], reactions: ['jordan@northstar.example', 'maya@northstar.example', 'avery@northstar.example'], savedBy: [], status: 'resolved', boardStatus: 'complete', views: 132,
        resolution: 'Free workspaces support unlimited viewers and up to three active editors.', resolvedBy: 'Maya Chen', resolvedById: 'demo-maya', resolvedAt: iso(30), relatedDocumentIds: [],
        replies: [{id: 'pricing-r1', workspaceId: 'northstar-demo', channelId: 'product', threadId: 'pricing-limits', authorId: 'demo-avery', authorName: 'Avery Morgan', authorEmail: 'avery@northstar.example', initials: 'AM', body: 'This gives us a much clearer upgrade boundary to explain in-product.', createdAt: iso(31), reactions: ['jamie@northstar.example']}],
      },
      {
        id: 'accessibility-audit', workspaceId: 'northstar-demo', channelId: 'design', title: 'Accessibility audit findings for workspace settings',
        body: 'Keyboard navigation is solid overall. Focus restoration after dialogs and two icon-only actions still need correction before release.',
        authorId: 'demo-avery', authorName: 'Avery Morgan', authorEmail: 'avery@northstar.example', initials: 'AM', createdAt: iso(65), updatedAt: iso(65), tags: ['a11y', 'design-system'], reactions: ['maya@northstar.example'], savedBy: [], status: 'discussion', boardStatus: 'review', views: 54, replies: [], relatedDocumentIds: [],
      },
      {
        id: 'onboarding-research', workspaceId: 'northstar-demo', channelId: 'product', title: 'Customer interview notes: onboarding week 34',
        body: 'Three recurring themes: people understand projects quickly, invite teammates later than expected, and want examples before creating their first workflow.',
        authorId: 'demo-jamie', authorName: 'Jamie Lee', authorEmail: 'jamie@northstar.example', initials: 'JL', createdAt: iso(190), updatedAt: iso(190), tags: ['research', 'onboarding'], reactions: [], savedBy: ['jordan@northstar.example'], status: 'open', boardStatus: 'planned', views: 70, replies: [], relatedDocumentIds: ['onboarding-notes'],
      },
      {
        id: 'launch-checklist', workspaceId: 'northstar-demo', channelId: 'launch-room', title: 'Launch readiness ownership and escalation path',
        body: 'Keep the final go/no-go owners and escalation path here so the private coordination context remains separate from general product discussion.',
        authorId: 'demo-owner', authorName: 'Jordan Blake', authorEmail: 'jordan@northstar.example', initials: 'JB', createdAt: iso(80), updatedAt: iso(70), tags: ['launch', 'decision'], reactions: ['maya@northstar.example'], savedBy: [], status: 'open', boardStatus: 'active', views: 24, replies: [], relatedDocumentIds: [],
      },
    ],
    documents: [
      {
        id: 'workspace-handbook', workspaceId: 'northstar-demo', title: 'Northstar workspace handbook', content: '## How we use Threadline\n\nStart a titled discussion when the answer should remain discoverable. Resolve decisions with a concise outcome. Move durable process or reference material into Documents and link the source discussion whenever possible.', channelId: 'general', tags: ['onboarding', 'process'], authorId: 'demo-owner', authorName: 'Jordan Blake', authorEmail: 'jordan@northstar.example', lastEditorId: 'demo-owner', lastEditorName: 'Jordan Blake', lastEditorEmail: 'jordan@northstar.example', createdAt: iso(60 * 24 * 10), updatedAt: iso(60 * 24 * 2), relatedThreadIds: [], versionCount: 1,
        versions: [{id: 'handbook-v1', workspaceId: 'northstar-demo', channelId: 'general', documentId: 'workspace-handbook', title: 'Northstar workspace handbook', content: 'Use titled discussions for decisions and reference material.', editorId: 'demo-owner', editorName: 'Jordan Blake', editorEmail: 'jordan@northstar.example', createdAt: iso(60 * 24 * 10)}],
      },
      {
        id: 'api-resilience', workspaceId: 'northstar-demo', title: 'API resilience guidelines', content: '## Retry policy\n\nClient requests may retry transient failures at most twice using exponential backoff with jitter. Honor `Retry-After` when supplied. Long-running recovery belongs in background jobs.\n\n## Source\n\nThis policy was produced from the retry-policy discussion.', channelId: 'engineering', tags: ['api', 'reliability'], authorId: 'demo-maya', authorName: 'Maya Chen', authorEmail: 'maya@northstar.example', lastEditorId: 'demo-maya', lastEditorName: 'Maya Chen', lastEditorEmail: 'maya@northstar.example', createdAt: iso(60 * 24 * 4), updatedAt: iso(4), relatedThreadIds: ['retry-policy'], versionCount: 1,
        versions: [{id: 'api-v1', workspaceId: 'northstar-demo', channelId: 'engineering', documentId: 'api-resilience', title: 'API resilience guidelines', content: 'Initial resilience notes.', editorId: 'demo-maya', editorName: 'Maya Chen', editorEmail: 'maya@northstar.example', createdAt: iso(60 * 24 * 4)}],
      },
      {
        id: 'onboarding-notes', workspaceId: 'northstar-demo', title: 'Onboarding research synthesis', content: '## Week 34 themes\n\n1. New users understand projects quickly.\n2. They invite teammates later than expected.\n3. Examples reduce blank-state hesitation.', channelId: 'product', tags: ['research', 'onboarding'], authorId: 'demo-jamie', authorName: 'Jamie Lee', authorEmail: 'jamie@northstar.example', lastEditorId: 'demo-jamie', lastEditorName: 'Jamie Lee', lastEditorEmail: 'jamie@northstar.example', createdAt: iso(180), updatedAt: iso(180), relatedThreadIds: ['onboarding-research'], versionCount: 0, versions: [],
      },
    ],
    activity: [
      {id: 'a1', workspaceId: 'northstar-demo', type: 'resolution', summary: 'Resolved “What should our API retry policy look like?”', actorId: 'demo-owner', actorName: 'Jordan Blake', createdAt: iso(5), targetId: 'retry-policy'},
      {id: 'a2', workspaceId: 'northstar-demo', type: 'document', summary: 'Updated “API resilience guidelines”', actorId: 'demo-maya', actorName: 'Maya Chen', createdAt: iso(4), targetId: 'api-resilience'},
      {id: 'a3', workspaceId: 'northstar-demo', type: 'resolution', summary: 'Resolved the free workspace limits decision', actorId: 'demo-maya', actorName: 'Maya Chen', createdAt: iso(30), targetId: 'pricing-limits'},
      {id: 'a4', workspaceId: 'northstar-demo', type: 'discussion', summary: 'Started “Accessibility audit findings for workspace settings”', actorId: 'demo-avery', actorName: 'Avery Morgan', createdAt: iso(65), targetId: 'accessibility-audit'},
    ],
    notifications: [
      {id: 'n1', workspaceId: 'northstar-demo', recipientId: 'demo-owner', recipientEmail: 'jordan@northstar.example', text: 'Maya Chen resolved the API retry policy discussion.', type: 'resolution', createdAt: iso(5), read: false, targetThreadId: 'retry-policy'},
      {id: 'n2', workspaceId: 'northstar-demo', recipientId: 'demo-owner', recipientEmail: 'jordan@northstar.example', text: 'API resilience guidelines were updated.', type: 'document', createdAt: iso(4), read: false, targetDocumentId: 'api-resilience'},
    ],
    createdAt: now,
    updatedAt: now,
  };
}
