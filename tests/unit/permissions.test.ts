import {describe, expect, it} from 'vitest';
import {canAccessChannel, canDeleteDiscussion, canManage, canWrite} from '../../src/permissions';
import type {Channel, Discussion, Member} from '../../src/types';

const owner: Member = {id: 'owner', name: 'Owner', email: 'owner@example.com', initials: 'OW', role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z'};
const member: Member = {id: 'member', name: 'Member', email: 'member@example.com', initials: 'ME', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z'};
const guest: Member = {id: 'guest', name: 'Guest', email: 'guest@example.com', initials: 'GU', role: 'guest', joinedAt: '2026-01-01T00:00:00.000Z'};
const publicChannel: Channel = {id: 'general', name: 'general', description: '', private: false, memberIds: []};
const privateChannel: Channel = {id: 'private', name: 'private', description: '', private: true, memberIds: ['member']};
const discussion: Discussion = {id: 'thread', channelId: 'general', title: 'Thread', body: 'Body', authorId: 'member', authorName: 'Member', authorEmail: 'member@example.com', initials: 'ME', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], replies: [], reactions: [], savedBy: [], status: 'open', boardStatus: 'backlog', relatedDocumentIds: [], views: 0};

describe('permissions', () => {
  it('separates write and management capabilities', () => {
    expect(canWrite('member')).toBe(true);
    expect(canWrite('guest')).toBe(false);
    expect(canManage('admin')).toBe(true);
    expect(canManage('member')).toBe(false);
  });

  it('enforces private channel membership while allowing managers', () => {
    expect(canAccessChannel(publicChannel, guest)).toBe(true);
    expect(canAccessChannel(privateChannel, member)).toBe(true);
    expect(canAccessChannel(privateChannel, guest)).toBe(false);
    expect(canAccessChannel(privateChannel, owner)).toBe(true);
  });

  it('limits discussion deletion to the author or managers', () => {
    expect(canDeleteDiscussion(discussion, member)).toBe(true);
    expect(canDeleteDiscussion(discussion, owner)).toBe(true);
    expect(canDeleteDiscussion(discussion, guest)).toBe(false);
  });
});
