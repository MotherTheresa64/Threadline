# Threadline

**Conversations that become knowledge.** Threadline is a collaborative discussion workspace that turns team conversations into durable, searchable decisions instead of letting useful context disappear in chat.

## Highlights

- Channel-based discussion workspace with inbox, saved threads, topics, and presence
- Search across thread titles, bodies, authors, and tags
- Thread detail pane with replies, reactions, bookmarks, solved/decision states, and related context
- Create-thread composer with topic assignment and rich metadata
- Responsive three-pane desktop experience that collapses cleanly for mobile
- Local-first demo persistence for zero-friction portfolio review
- Firebase-ready authentication adapter and Render-ready Express host
- Health endpoint and environment-safe deployment configuration

## Stack

React 19 · TypeScript · Vite · Express · Firebase Auth (optional) · Lucide · custom responsive CSS

## Local development

```bash
npm install
npm run dev
```

The demo works immediately without credentials. Add Firebase values from `.env.example` when you want real Google authentication.

## Production

```bash
npm install
npm run build
npm start
```

The included `render.yaml` deploys the app as a single Render web service.

## Why this exists

Threadline is intentionally not a social-feed clone. It models a real collaboration problem: preserving decisions, questions, references, and expertise with enough structure to be searchable later while still feeling as fast as chat.
