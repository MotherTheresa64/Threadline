# Threadline Deployment Runbook

## 1. Preflight

Use Node `22.16.0` (the repo includes `.nvmrc`). From the repository root:

```bash
npm install
npm run check
npm run smoke:server
```

`npm run check` typechecks both TypeScript targets, builds the Vite client and Express server, and verifies the required production artifacts. `npm run smoke:server` boots the compiled host on a temporary port, validates `/api/health`, confirms unknown API paths return JSON `404`, and shuts the process down.

For manual production-host inspection:

```bash
npm start
```

## 2. Firebase Auth

Create a Firebase project and web app, enable Google sign-in, and configure:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Store real values only in local `.env` and Render environment variables. After deployment, add the Render hostname to Firebase Authentication authorized domains.

## 3. Render

Create a Blueprint from this repository. The included `render.yaml` defines a single Node web service.

Expected commands:

```text
Build: npm install --include=dev --no-audit --no-fund && npm run check
Start: npm start
Health: /api/health
```

Enter the four Firebase values for the `sync: false` environment variables.

## 4. First-deploy checks

Verify:

1. desktop shows navigation, feed, and detail panes;
2. tablet/mobile opens a selected thread in the detail drawer;
3. Escape and the close control dismiss that drawer;
4. channel counts reflect thread state;
5. Saved, Explore, Popular, and Unanswered views behave correctly;
6. `Ctrl/Cmd+K` focuses search;
7. creating a thread, replying, liking, and saving persist after refresh;
8. copied thread links reopen the correct discussion;
9. Google sign-in works once Firebase is configured;
10. `/api/health` returns `200` JSON and unknown `/api/*` routes return JSON `404` responses;
11. browser console has no uncaught errors.

## 5. Hosted persistence phase

When moving beyond the local-first demo, introduce authenticated API endpoints for workspaces, channels, threads, replies, reactions, and bookmarks. Verify Firebase ID tokens server-side and enforce workspace membership on every resource operation.

PostgreSQL is a suitable first datastore. Full-text search can initially stay inside PostgreSQL rather than adding search infrastructure prematurely.

## 6. After deployment

Once the public URL is stable:

- add it to the GitHub repository homepage field;
- add the live URL and screenshots to the README;
- add an Open Graph preview image;
- update the portfolio and LinkedIn project entry;
- test copied thread URLs from a clean/incognito browser.

## Rollback

If a deploy regresses, restore the previous successful Render deploy. The core application should continue to function in local demo mode even if Firebase is temporarily unavailable or misconfigured.
