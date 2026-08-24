# Threadline

**Conversations that become knowledge.** Threadline is a collaborative discussion workspace for turning team questions, decisions, and implementation context into durable knowledge instead of letting useful information disappear in chat.

## What works today

- Channel-based workspace with Engineering, Product, Design, Research, and shared views
- Functional **Saved** and **Explore** scopes
- Latest, Popular, and Unanswered feed filtering
- Search across thread titles, bodies, authors, and tags
- `Ctrl/Cmd + K` keyboard search focus
- Thread detail experience with replies, reactions, saved state, resolved decisions, and copyable deep links
- Deep-linked thread URLs reopen the correct discussion
- New-thread composer with channel assignment and tag metadata
- Keyboard-accessible thread selection and icon actions
- Responsive mobile/tablet detail drawer with Escape/close behavior
- Browser persistence so created threads, replies, likes, and saved state survive refreshes
- Branded runtime error recovery instead of blank-screen failure
- Google sign-in hook when Firebase configuration is present
- Credential-free demo mode when Firebase is absent
- Installable web-app metadata and reduced-motion/focus accessibility safeguards
- Express production host with health endpoint, security headers, caching policy, and graceful shutdown
- Render Blueprint and GitHub Actions gated on the same full verification command

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive CSS  
**Auth:** Firebase Authentication (optional)  
**Hosting:** Express 5, Render Blueprint  
**Quality:** strict TypeScript, GitHub Actions, pinned dependency versions

## Local development

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

The product works immediately without credentials. Demo state is persisted in `localStorage`.

Full preflight:

```bash
npm run check
```

That command typechecks both targets, builds client/server, and verifies the required production artifacts. Run `npm start` afterward to test the compiled Express-hosted build.

## Firebase authentication

Copy `.env.example` to `.env` and provide the four `VITE_FIREBASE_*` values from a Firebase web app. Enable Google as an Authentication provider.

When credentials are unavailable, Threadline remains fully reviewable in demo mode instead of blocking the interface behind a login screen.

## Production boundary

Thread content currently uses local-first persistence so a recruiter or reviewer can interact with the application without external setup. Firebase is already isolated behind `src/firebase.ts`, and the Node host is isolated in `server/index.ts`, leaving a clean boundary for replacing browser persistence with a hosted API/database layer later.

`GET /api/health` reports service readiness without exposing secrets.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — interaction model, responsive architecture, persistence, deep links, auth, and hosted-data evolution
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local/Render/Firebase deployment runbook and hosted-persistence phase
- [`docs/QA.md`](docs/QA.md) — feed, thread, deep-link, mobile drawer, auth, API, and accessibility acceptance checklist

## Deployment

The included `render.yaml` pins the Node runtime, installs the build toolchain, exposes Firebase environment placeholders, starts the compiled Express server, and uses `/api/health` for service checks.

```text
GitHub repo → npm install → npm run check → Express host → health check
```

CI uses the same `npm run check` contract, keeping local, CI, and Render verification aligned.

## Why this project matters

Threadline is intentionally not a generic social feed. It models a real collaboration problem: preserving decisions, technical context, questions, and expertise with enough structure to stay searchable later while retaining the speed of conversational software. The project demonstrates interaction design, derived filtering, persistent state, accessibility considerations, auth integration boundaries, and deployable full-stack structure.
