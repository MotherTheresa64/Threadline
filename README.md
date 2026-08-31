# Threadline

**Conversations that become knowledge.** Threadline is a collaborative discussion workspace for turning team questions, decisions, and implementation context into durable knowledge instead of letting useful information disappear in chat.

**Live demo:** https://threadline-ga8w.onrender.com

## What works today

- Channel-based workspace with Engineering, Product, Design, Research, Random, and cross-workspace views
- Functional **Inbox** for unresolved work, **Saved** for bookmarks, and **Explore** for the complete knowledge base
- Latest, Popular, and Unanswered feed filtering
- Search across thread titles, bodies, authors, tags, and channels
- `Ctrl/Cmd + K` keyboard search focus
- Thread detail experience with replies, likes, bookmarks, resolved state, and copyable deep links
- Deep-linked thread URLs reopen the correct discussion
- Thread view counts increment when discussions are opened
- Threads can be resolved, reopened, or deleted
- Replies support persistent Helpful reactions
- New-thread composer with channel assignment and tag metadata
- Real workspace settings panel with auth/persistence status and sample-workspace reset
- Keyboard-accessible interaction model with Escape handling for navigation, detail, composer, and settings layers
- Responsive mobile/tablet detail drawer with full-width phone treatment
- Defensive browser persistence so created threads, replies, reactions, views, saved state, and resolution state survive refreshes
- Corrupted or unavailable local storage falls back safely instead of crashing the workspace
- Branded runtime error recovery instead of blank-screen failure
- Google sign-in hook when Firebase configuration is present
- Credential-free local-first mode when Firebase is absent
- Installable web-app metadata, canonical production metadata, reduced-motion support, and visible keyboard focus safeguards
- Express production host with health endpoint, security headers, caching policy, API 404 handling, and graceful shutdown
- Render auto-deploy from `main` with `/api/health` health checks
- GitHub Actions and Render builds gated on the same full verification command

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive CSS  
**Auth:** Firebase Authentication (optional final integration)  
**Persistence:** local-first discussion workspace  
**Hosting:** Express 5 + Render  
**Quality:** strict TypeScript, GitHub Actions, pinned dependency versions

## Local development

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

The product works immediately without credentials. Workspace state is persisted in `localStorage`.

Full preflight:

```bash
npm run check
npm run smoke:server
```

`npm run check` typechecks both targets, builds client/server, and verifies the required production artifacts. `npm run smoke:server` boots the compiled Express app and verifies its health/API behavior.

## Firebase authentication

Copy `.env.example` to `.env` and provide the four `VITE_FIREBASE_*` values from a Firebase web app. Enable Google as an Authentication provider.

When credentials are unavailable, Threadline remains fully reviewable in local-first mode instead of blocking the interface behind a login screen.

## Persistence boundary

Thread content currently uses local-first persistence so a reviewer can immediately create, resolve, reply to, save, and revisit discussions without external setup. Firebase is isolated behind `src/firebase.ts`, and the Node host is isolated in `server/index.ts`, leaving a clean boundary for hosted persistence.

For real multi-user workspaces and cross-device data, the remaining production integration is Firebase Authentication plus a hosted datastore such as Firestore, with workspace membership and document access keyed to authenticated users. The current live demo intentionally keeps data browser-local.

`GET /api/health` reports service readiness without exposing secrets.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — interaction model, responsive architecture, persistence, deep links, auth, and hosted-data evolution
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local/Render/Firebase deployment runbook and hosted-persistence phase
- [`docs/QA.md`](docs/QA.md) — feed, thread, deep-link, mobile drawer, auth, API, and accessibility acceptance checklist
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — quick map of the files that own workspace UI, persistence, auth, server, and deployment

## Deployment

The production Render service tracks `main` with Auto-Deploy enabled. Each commit follows:

```text
GitHub main → npm install → npm run check → Express host → /api/health → live
```

CI uses the same `npm run check` contract, keeping local, CI, and Render verification aligned.

## Why this project matters

Threadline is intentionally not a generic social feed. It models a real collaboration problem: preserving decisions, technical context, questions, and expertise with enough structure to remain searchable later while retaining the speed of conversational software. The project demonstrates interaction design, derived filtering, persistent state, deep linking, resolution workflows, accessibility, auth boundaries, responsive application architecture, and deployable full-stack structure.
