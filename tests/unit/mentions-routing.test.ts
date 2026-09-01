import {describe, expect, it} from 'vitest';
import {findMentionedMembers, memberMention} from '../../src/mentions';
import {parseRoute, routeForChannel, routeForDiscussion, routeForDocument, routeForView} from '../../src/routing';
import type {Member} from '../../src/types';

const members: Member[] = [
  {id: '1', name: 'Maya Chen', email: 'maya@example.com', initials: 'MC', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z'},
  {id: '2', name: 'Maya Patel', email: 'maya.p@example.com', initials: 'MP', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z'},
  {id: '3', name: 'Avery Morgan', email: 'avery@example.com', initials: 'AM', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z'},
];

describe('mentions', () => {
  it('requires a full name when first names are ambiguous', () => {
    expect(findMentionedMembers('Thanks @maya', members)).toEqual([]);
    expect(findMentionedMembers('Thanks @maya-chen', members).map(member => member.id)).toEqual(['1']);
  });

  it('supports unique first names without rendering HTML', () => {
    expect(memberMention(members[2])).toBe('@avery-morgan');
    expect(findMentionedMembers('Please check this, @avery.', members).map(member => member.id)).toEqual(['3']);
  });
});

describe('routing', () => {
  it('round-trips workspace destinations', () => {
    expect(parseRoute(routeForView('workspace one', 'documents'))).toEqual({kind: 'workspace', workspaceId: 'workspace one', view: 'documents'});
    expect(parseRoute(routeForChannel('w1', 'private-room'))).toEqual({kind: 'channel', workspaceId: 'w1', channelId: 'private-room'});
    expect(parseRoute(routeForDiscussion('w1', 'd1'))).toEqual({kind: 'discussion', workspaceId: 'w1', discussionId: 'd1'});
    expect(parseRoute(routeForDocument('w1', 'doc1'))).toEqual({kind: 'document', workspaceId: 'w1', documentId: 'doc1'});
  });

  it('rejects unknown routes intentionally', () => {
    expect(parseRoute('/totally/unknown')).toEqual({kind: 'unknown'});
    expect(parseRoute('/w/demo/unsupported')).toEqual({kind: 'unknown'});
  });
});
