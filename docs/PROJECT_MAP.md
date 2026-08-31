# Threadline Project Map

```text
.
├── src/
│   ├── App.tsx             Inbox/feed/filtering, threads, resolution, replies, settings, deep links
│   ├── firebase.ts         Optional Firebase Google-auth adapter
│   ├── theme.ts            Persistent four-theme appearance controller
│   ├── ErrorBoundary.tsx   Runtime recovery and local-data reset path
│   ├── styles.css          Core visual system
│   ├── interaction.css     Full-card thread interaction layering
│   ├── mobile-detail.css   Tablet/mobile thread-detail drawer behavior
│   ├── final-polish.css    Responsive/mobile and settings/detail overrides
│   ├── themes.css          Reading-theme palettes and surface system
│   ├── theme-aliases.css  Legacy token bridge for complete theme coverage
│   ├── release-polish.css Final presentation/micro-interaction layer
│   ├── theme-layout.css   Theme-control/toast layout safeguards
│   └── accessibility.css Focus visibility and reduced-motion rules
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
| Change theme choices/persistence | `src/theme.ts` |
| Change theme palettes/surfaces | `src/themes.css`, `src/theme-aliases.css` |
| Change final presentation details | `src/release-polish.css`, `src/theme-layout.css` |
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

Use `docs/QA.md` for interaction, deep-link, persistence, theme, and mobile acceptance after automated checks pass.
