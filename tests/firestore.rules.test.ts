import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc, getDoc, setDoc, updateDoc, writeBatch} from 'firebase/firestore';

const projectId = 'threadline-test';
let env: RulesTestEnvironment;

const auth = (uid: string, email: string) => env.authenticatedContext(uid, {email}).firestore();

async function seed() {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'workspaces', 'w1'), {
      name: 'Test Workspace', description: 'Rules test', ownerId: 'owner', ownerEmail: 'owner@example.com',
      schemaVersion: 2, createdAt: new Date(), updatedAt: new Date(),
    });
    const members = [
      ['owner', 'owner@example.com', 'owner'],
      ['admin', 'admin@example.com', 'admin'],
      ['member', 'member@example.com', 'member'],
      ['private-member', 'private@example.com', 'member'],
      ['guest', 'guest@example.com', 'guest'],
    ] as const;
    for (const [uid, email, role] of members) {
      await setDoc(doc(db, 'memberships', `w1_${uid}`), {workspaceId: 'w1', userId: uid, email, name: uid, initials: uid.slice(0, 2).toUpperCase(), role, status: 'active', joinedAt: new Date()});
    }
    await setDoc(doc(db, 'workspaces', 'w1', 'channels', 'general'), {name: 'general', description: '', private: false, memberIds: [], createdById: 'owner', createdAt: new Date(), updatedAt: new Date()});
    await setDoc(doc(db, 'workspaces', 'w1', 'channels', 'private'), {name: 'private', description: '', private: true, memberIds: ['private-member'], createdById: 'owner', createdAt: new Date(), updatedAt: new Date()});
    await setDoc(doc(db, 'discussions', 'private-thread'), {
      workspaceId: 'w1', channelId: 'private', title: 'Private decision', body: 'secret context', authorId: 'owner', authorName: 'Owner', authorEmail: 'owner@example.com', initials: 'OW', tags: [], status: 'open', boardStatus: 'backlog', relatedDocumentIds: [], views: 1, createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'invitations', 'valid-invite'), {
      workspaceId: 'w1', workspaceName: 'Test Workspace', email: 'outsider@example.com', role: 'member', status: 'pending', createdById: 'admin', createdByName: 'Admin', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    });
    await setDoc(doc(db, 'invitations', 'expired-invite'), {
      workspaceId: 'w1', workspaceName: 'Test Workspace', email: 'expired@example.com', role: 'member', status: 'pending', createdById: 'admin', createdByName: 'Admin', createdAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() - 60_000),
    });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8')},
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

afterAll(async () => {
  await env.cleanup();
});

describe('workspace and channel privacy', () => {
  it('blocks outsiders from workspace data', async () => {
    await assertFails(getDoc(doc(auth('outsider', 'outsider@example.com'), 'workspaces', 'w1')));
  });

  it('allows members to public channels but not private channels they do not belong to', async () => {
    const memberDb = auth('member', 'member@example.com');
    await assertSucceeds(getDoc(doc(memberDb, 'workspaces', 'w1')));
    await assertSucceeds(getDoc(doc(memberDb, 'workspaces', 'w1', 'channels', 'general')));
    await assertFails(getDoc(doc(memberDb, 'workspaces', 'w1', 'channels', 'private')));
    await assertFails(getDoc(doc(memberDb, 'discussions', 'private-thread')));
  });

  it('allows explicit private members and managers into private channels', async () => {
    await assertSucceeds(getDoc(doc(auth('private-member', 'private@example.com'), 'discussions', 'private-thread')));
    await assertSucceeds(getDoc(doc(auth('admin', 'admin@example.com'), 'discussions', 'private-thread')));
  });
});

describe('membership and role integrity', () => {
  it('prevents a member from escalating their own role', async () => {
    await assertFails(updateDoc(doc(auth('member', 'member@example.com'), 'memberships', 'w1_member'), {role: 'admin'}));
  });

  it('prevents arbitrary client-side membership creation', async () => {
    await assertFails(setDoc(doc(auth('outsider', 'outsider@example.com'), 'memberships', 'w1_outsider'), {
      workspaceId: 'w1', userId: 'outsider', email: 'outsider@example.com', name: 'Outsider', initials: 'OU', role: 'member', status: 'active', joinedAt: new Date(),
    }));
  });

  it('permits membership only when a matching invitation is accepted atomically', async () => {
    const db = auth('outsider', 'outsider@example.com');
    const batch = writeBatch(db);
    batch.set(doc(db, 'memberships', 'w1_outsider'), {
      workspaceId: 'w1', userId: 'outsider', email: 'outsider@example.com', name: 'Outsider', initials: 'OU', role: 'member', status: 'active', inviteId: 'valid-invite', joinedAt: new Date(),
    });
    batch.update(doc(db, 'invitations', 'valid-invite'), {status: 'accepted', acceptedById: 'outsider', respondedAt: new Date()});
    await assertSucceeds(batch.commit());
    expect((await getDoc(doc(db, 'memberships', 'w1_outsider'))).exists()).toBe(true);
  });

  it('rejects acceptance of an expired invitation', async () => {
    const db = auth('expired', 'expired@example.com');
    const batch = writeBatch(db);
    batch.set(doc(db, 'memberships', 'w1_expired'), {
      workspaceId: 'w1', userId: 'expired', email: 'expired@example.com', name: 'Expired', initials: 'EX', role: 'member', status: 'active', inviteId: 'expired-invite', joinedAt: new Date(),
    });
    batch.update(doc(db, 'invitations', 'expired-invite'), {status: 'accepted', acceptedById: 'expired', respondedAt: new Date()});
    await assertFails(batch.commit());
  });
});

describe('content authorship and write permissions', () => {
  const discussionPayload = (authorId: string, authorEmail: string) => ({
    workspaceId: 'w1', channelId: 'general', title: 'A real discussion', body: 'Useful context', authorId, authorName: 'Member', authorEmail, initials: 'ME', createdAt: new Date(), updatedAt: new Date(), tags: ['test'], status: 'open', boardStatus: 'backlog', relatedDocumentIds: [], views: 1,
  });

  it('allows members to create authored content in accessible channels', async () => {
    await assertSucceeds(setDoc(doc(auth('member', 'member@example.com'), 'discussions', 'member-thread'), discussionPayload('member', 'member@example.com')));
  });

  it('blocks forged authorship', async () => {
    await assertFails(setDoc(doc(auth('member', 'member@example.com'), 'discussions', 'forged-thread'), discussionPayload('owner', 'owner@example.com')));
  });

  it('keeps guests read-only', async () => {
    await assertFails(setDoc(doc(auth('guest', 'guest@example.com'), 'discussions', 'guest-thread'), discussionPayload('guest', 'guest@example.com')));
  });
});
