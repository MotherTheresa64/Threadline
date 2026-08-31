# Threadline

**Where ideas connect and teams create together.** Threadline is a collaborative team knowledge and communication workspace built to keep discussions, decisions, documents, and ongoing work connected instead of scattering useful context across chat and disconnected tools.

**Live demo:** https://threadline-ga8w.onrender.com

## Product model

Threadline is organized around a durable path:

**Workspace → Channel → Discussion → Replies → Resolution → Knowledge**

A discussion is intentionally titled and searchable. When the team reaches an outcome, the thread can be resolved with a concise decision instead of forcing a future reader to reconstruct the answer from dozens of replies. Durable material can then be moved into a versioned knowledge document that links back to its source discussion.

## What works today

- Multiple isolated workspaces with switching and workspace creation
- Workspace member roles: **Owner, Admin, Member, Guest/viewer**
- Admin member invitations by email and member removal
- Admin channel creation and channel-scoped discussions
- Public workspace channels plus a data model for private-channel membership
- Titled discussions with authorship, tags, threaded replies, reactions, bookmarks, view counts, and deep links
- Discussion states for open/in-discussion/resolved/archived workflows
- Explicit resolution/decision summaries with resolver and timestamp
- Key/accepted replies for important answers
- Member mentions in replies that create relevant inbox notifications
- Global **Search anything** across discussions, decisions, tags, authors, channels, and documents
- Persistent knowledge documents with tags, channel relationships, source discussions, editor metadata, and version history
- Restoreable prior document versions
- Connected discussion → decision → documentation relationships
- Saved/bookmarked discussions
- Inbox with read/unread notification state
- Workspace activity timeline for meaningful changes
- Lightweight board view with Backlog, Planned, Active, Review, and Complete states
- Home overview with open discussions, recorded decisions, documents, members, recent discussions, and recently updated knowledge
- Stable deep links for discussions and documents
- Responsive desktop/tablet/mobile workspace navigation and detail drawers
- Keyboard shortcut: `Ctrl/Cmd + K` focuses global search; `Escape` closes overlays/detail/navigation
- Four existing appearance themes: **Paper, Moss, Lavender, and Night**
- Fictional demo organization and fictional sample people/content only
- Express production host with health endpoint, security headers, caching policy, API 404 handling, and graceful shutdown
- Render deployment and GitHub Actions verification

## Real-time multi-user mode

Threadline keeps a no-credential demo mode so the portfolio build always opens, but Firebase configuration now enables a genuine shared workspace mode:

- Firebase Authentication supplies persistent user identity.
- Firestore stores shared workspace data.
- Firestore `onSnapshot` listeners update a signed-in member's workspace list in real time.
- Workspace membership is keyed to verified authentication email.
- Firestore security rules isolate workspaces and enforce owner/admin management versus member collaboration versus guest read-only access.

The current Firestore document model stores each workspace as one collaboration snapshot. That is intentionally simple for this portfolio-scale implementation. A high-volume production evolution would split discussions, replies, documents, notifications, and activity into subcollections to reduce write contention and enable more granular per-record rules.

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive/themed CSS  
**Auth:** Firebase Authentication / Google provider  
**Shared data:** Cloud Firestore when configured  
**Demo persistence:** localStorage fallback  
**Hosting:** Express 5 + Render  
**Quality:** strict TypeScript, GitHub Actions, pinned dependency versions

## Local development

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

Without Firebase credentials, Threadline starts in a fully interactive browser-local demo workspace.

Full preflight:

```bash
npm run check
npm run smoke:server
```

`npm run check` typechecks both targets, builds client/server, and verifies the required production artifacts. `npm run smoke:server` boots the compiled Express app and verifies its health/API behavior.

## Firebase setup

1. Create a Firebase project and web app.
2. Enable **Google** in Firebase Authentication.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env` and fill in:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

5. Deploy the included Firestore rules:

```bash
npx firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

The included `firestore.rules` enforce:

- verified authenticated email for shared workspaces,
- workspace reads only for listed members,
- owner/admin control over membership, channels, and workspace settings,
- member writes only to collaborative content fields,
- guest/viewer read-only access,
- owner-only workspace deletion.

### Invitations

An admin invites a teammate by email from Workspace Settings. That email is added to the workspace membership list with the selected role. When the teammate signs in with that same Google account, Firestore membership rules allow the workspace to appear automatically.

## Demo mode

When Firebase is not configured—or when a visitor has not signed in—the application uses a fictional Northstar Labs workspace in browser storage. Demo content never uses real friends, relatives, private email addresses, or private conversations.

This keeps the public portfolio reviewable without credentials while preserving a real shared-data path for authenticated users.

## Persistence and authorization boundary

`src/firebase.ts` owns authentication, Firestore subscriptions, and shared saves. `firestore.rules` owns the server-side workspace membership/role boundary. `src/seed.ts` owns fictional demo data. `src/types.ts` defines the collaboration domain model. `src/App.tsx` owns product interaction and derives board, search, inbox, timeline, resolution, and knowledge workflows from that model.

Because regular member updates are currently stored inside a workspace snapshot document, rules can prevent members from changing workspace identity, membership, roles, and channels, but they cannot perfectly distinguish one member's nested thread/reply mutation from another member's nested thread/reply mutation. The production-scale evolution is to move those records to subcollections with author-specific rules.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — interaction model and system architecture
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local/Render/Firebase deployment runbook
- [`docs/QA.md`](docs/QA.md) — release acceptance checklist
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — file ownership map

## Deployment

The production Render service tracks `main` with Auto-Deploy enabled. Each commit follows:

```text
GitHub main → npm install → npm run check → Express host → /api/health → live
```

Render serves the React application and Express health/API surface. Firebase Authentication and Firestore remain managed Firebase services and use the browser's public web-app configuration; no Firebase secret is embedded in the repository.

## Why this project matters

Threadline is not a Slack clone, Discord clone, personal to-do app, or full project planner. Its defining purpose is to preserve the relationship between communication and institutional knowledge. The project demonstrates multi-workspace collaboration, role-aware authorization, real-time hosted data, discussion and resolution workflows, searchable knowledge, document history, deep linking, responsive application architecture, theme systems, accessibility, and deployable full-stack structure.
