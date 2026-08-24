# Threadline Architecture

## Goals

Threadline is a collaboration product organized around durable, searchable discussion rather than transient chat. The portfolio build is intentionally usable without credentials while keeping authentication and hosted persistence as explicit integration seams.

## Runtime shape

```text
Browser
  React 19 + TypeScript
      |
      +-- typed Thread / Reply state
      +-- localStorage demo persistence
      +-- firebase.ts -> optional Google authentication
      +-- URL hash -> deep-linked thread selection
      |
Express production host
      +-- /api/health
      +-- static Vite build / SPA fallback
```

## Interaction model

Threads are the primary unit. Each thread owns channel metadata, tags, replies, reactions, saved/resolved state, and lightweight engagement counts. Workspace navigation applies a scope first (channel, saved, or all), then a feed mode (latest, popular, unanswered), then free-text search.

This ordering keeps filtering predictable and maps naturally to future indexed database queries.

## Responsive architecture

Desktop uses a three-pane information layout: workspace navigation, thread feed, and thread detail. Tablet/mobile hides the persistent detail pane and opens the selected thread in a dedicated drawer. This preserves the same information hierarchy without forcing the desktop layout onto narrow screens.

## Persistence

The current demo writes the thread collection to browser storage so replies, reactions, saved state, and created discussions survive refreshes. The source seed remains available as a zero-friction initial workspace.

A production implementation should move canonical thread/reply state to an API and retain local optimistic updates for reactions, bookmarks, and replies.

## Deep links

Copy-link behavior stores the selected thread ID in the URL hash. Loading a valid hash reopens that thread. This gives the application shareable navigation semantics today without requiring a routing dependency; a larger product could migrate this to explicit routes such as `/threads/:id`.

## Authentication

Firebase initialization is lazy and environment-driven. Demo mode remains functional with no secrets. In production, Firebase identity should be verified by the backend and mapped to workspace memberships/permissions before any collaborative data is returned.

## Deployment

The Node host serves the Vite bundle and provides an operational health endpoint. It applies baseline security headers, correct API 404 behavior, immutable hashed-asset caching, fresh HTML delivery, and graceful termination handling.

## Production data model

A natural relational model includes:

- users
- workspaces
- memberships
- channels
- threads
- replies
- thread_tags
- reactions
- bookmarks

Search can begin with PostgreSQL full-text search and move to a dedicated index only if scale warrants it.

## Tradeoffs

The current build favors a rich, credential-free reviewer experience over pretending to offer multi-user collaboration without infrastructure. The UI, auth adapter, deep-link semantics, and data shape are built so hosted persistence can be introduced without redesigning the product.
