# Threadline Project Map

```text
.
├── src/
│   ├── App.tsx             Inbox/feed/filtering, threads, resolution, replies, settings, deep links
│   ├── firebase.ts         Optional Firebase Google-auth adapter
│   ├── ErrorBoundary.tsx   Runtime recovery and local-data reset path
│   ├── styles.css          Core visual system
│   ├── interaction.css     Full-card thread interaction layering
│   ├── mobile-detail.css   Tablet/mobile thread-detail drawer behavior
│   ├── final-polish.css    Final responsive/mobile and settings/detail overrides
│   └── accessibility.css   Focus visibility and reduced-motion rules
├── server/
│   └── index.ts            Express production host and health endpoint
├── scripts/
│   ├── verify-build.mjs    Required production-artifact verifier
│   └── smoke-server.mjs    Compiled-server integration smoke test
├── docs/
│   ├── ARCHITECTURE.md     Collaboration/data architecture
│   ├── DEPLOYMENT.md       Render/Firebase deployment runbook
│   ├── QA.md               Functional/responsive acceptance checklist
│   └── PROJECT_MAP.md      This file
├── .github/workflows/ci.yml
├── render.yaml
└── package.json
```

## Where to make common changes

| Goal | Primary files |
| --- | --- |
| Change inbox/channel/feed/thread behavior | `src/App.tsx` |
| Change reply reactions, resolution, deletion, settings, or reset behavior | `src/App.tsx` |
| Change deep-link/copy-link behavior | `src/App.tsx` |
| Connect/replace authentication | `src/firebase.ts` |
| Add hosted multi-user collaboration | new data adapter/API plus authenticated workspace membership |
| Change core styling | `src/styles.css` |
| Change thread-card interaction layering | `src/interaction.css` |
| Change mobile detail experience | `src/mobile-detail.css`, `src/final-polish.css` |
| Change accessibility defaults | `src/accessibility.css` |
| Change Render deployment | `render.yaml` |
| Change CI/preflight behavior | `package.json`, `scripts/*`, `.github/workflows/ci.yml` |

## Verification commands

```bash
npm run check
npm run smoke:server
```

Use `docs/QA.md` for interaction, deep-link, persistence, and mobile acceptance after automated checks pass.
