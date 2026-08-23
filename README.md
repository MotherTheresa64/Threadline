# Threadline

**Conversations that become knowledge.** Threadline is a collaborative discussion workspace for turning team questions, decisions, and implementation context into durable knowledge instead of letting useful information disappear in chat.

## What works today

- Channel-based workspace with Engineering, Product, Design, Research, and shared views
- Functional **Saved** and **Explore** scopes
- Latest, Popular, and Unanswered feed filtering
- Search across thread titles, bodies, authors, and tags
- Thread detail experience with replies, reactions, saved state, resolved decisions, and copyable links
- New-thread composer with channel assignment and tag metadata
- Keyboard-accessible thread selection and accessible icon actions
- Browser persistence so created threads, replies, likes, and saved state survive refreshes
- Google sign-in hook when Firebase configuration is present
- Credential-free demo mode when Firebase is absent
- Express production host, health endpoint, Render Blueprint, and CI build/typecheck validation

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

Useful checks:

```bash
npm run typecheck
npm run build
npm start
```

## Firebase authentication

Copy `.env.example` to `.env` and provide the four `VITE_FIREBASE_*` values from a Firebase web app. Enable Google as an Authentication provider.

When credentials are unavailable, Threadline remains fully reviewable in demo mode instead of blocking the interface behind a login screen.

## Production boundary

Thread content currently uses local-first persistence so a recruiter or reviewer can interact with the application without external setup. Firebase is already isolated behind `src/firebase.ts`, and the Node host is isolated in `server/index.ts`, leaving a clean boundary for replacing browser persistence with a hosted API/database layer later.

`GET /api/health` reports service readiness without exposing secrets.

## Deployment

The included `render.yaml` installs the build toolchain explicitly, pins the Node runtime, exposes Firebase environment placeholders, starts the compiled Express server, and uses `/api/health` for service checks.

GitHub Actions independently runs TypeScript checks, builds both client and server, and verifies the expected production artifacts exist.

## Why this project matters

Threadline is intentionally not a generic social feed. It models a real collaboration problem: preserving decisions, technical context, questions, and expertise with enough structure to stay searchable later while retaining the speed of conversational software. The project demonstrates interaction design, derived filtering, persistent state, accessibility considerations, auth integration boundaries, and deployable full-stack structure.
