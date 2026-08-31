# Threadline QA Checklist

Use this after a local build and again against the deployed Render URL.

## Smoke

- [ ] App loads without blank screen or uncaught console errors.
- [ ] Branded title/favicon appear.
- [ ] Existing sample threads render immediately without credentials.
- [ ] Refresh preserves created/replied/saved/reaction/view/resolution state.
- [ ] Invalid or unavailable local storage falls back safely.
- [ ] Error boundary presents a branded recovery screen if rendering fails.
- [ ] Workspace reset restores the original sample data.

## Navigation / feed

- [ ] Channel navigation updates the feed and heading.
- [ ] Channel counts reflect actual thread state.
- [ ] Inbox shows unresolved threads and its count updates after resolve/reopen actions.
- [ ] Saved shows only bookmarked threads.
- [ ] Explore shows threads across the workspace.
- [ ] Latest, Popular, and Unanswered modes behave correctly.
- [ ] Search matches thread title/body/author/tags/channel.
- [ ] `Ctrl/Cmd+K` focuses search.
- [ ] Changing scope/filter cannot leave the detail pane displaying a thread outside the current visible feed.

## Threads

- [ ] Selecting a thread opens the correct detail view and increments views.
- [ ] Desktop detail pane remains stable while feed scrolls.
- [ ] Tablet/mobile selection opens the detail drawer.
- [ ] Drawer closes with close control and Escape.
- [ ] Like increments visibly and persists after refresh.
- [ ] Save/un-save updates all relevant views and persists.
- [ ] Reply submission requires non-empty content and persists.
- [ ] Helpful reaction increments on the intended reply and persists.
- [ ] Reply action focuses the reply field.
- [ ] New thread validates required title/body.
- [ ] New thread appears in the selected channel and persists.
- [ ] Thread can be marked resolved and reopened.
- [ ] Resolved state updates Inbox and persists.
- [ ] Thread deletion requires confirmation, removes the intended thread, and leaves a valid selection.

## Settings

- [ ] Workspace settings opens a real panel rather than placeholder feedback.
- [ ] Auth status correctly reflects demo/Firebase-ready mode.
- [ ] Persistence status is visible.
- [ ] Reset action requires confirmation and restores seed state.
- [ ] Escape closes settings.

## Deep links / sharing

- [ ] Copy link writes a URL containing the selected thread ID.
- [ ] Opening that URL in a clean tab selects the correct thread.
- [ ] Invalid/missing thread hashes fail gracefully to a valid visible thread.
- [ ] Deep-linked thread remains usable on mobile detail view.

## Authentication

Without Firebase:

- [ ] Workspace/account control stays usable in local/demo mode.
- [ ] Attempted sign-in gives helpful feedback instead of crashing.

With Firebase:

- [ ] Google popup opens.
- [ ] Successful auth gives visible confirmation.
- [ ] Cancelled/failed popup is handled cleanly.

## Production host

- [ ] `GET /api/health` -> `200` JSON.
- [ ] Unknown `/api/*` -> JSON `404`.
- [ ] Hard refresh works on copied deep-link URLs.
- [ ] Hashed assets receive long cache headers.
- [ ] HTML remains refreshable after deploys.
- [ ] Security headers are present.

## Accessibility / mobile

- [ ] Full thread cards are keyboard activatable.
- [ ] Nested interactive controls do not trigger card selection accidentally.
- [ ] Focus styles are visible.
- [ ] Reduced-motion preference is respected.
- [ ] Mobile drawer can be fully operated without a mouse.
- [ ] Composer/settings panels stay inside the viewport and remain scrollable.
- [ ] Feed filters remain usable on narrow screens.
- [ ] Thread content wraps without page-level horizontal overflow.

## Viewports

- [ ] 360x800 small Android portrait
- [ ] 390x844 phone portrait
- [ ] 844x390 phone landscape
- [ ] 768x1024 tablet
- [ ] 1024x768 small laptop/tablet landscape
- [ ] 1366x768 laptop
- [ ] 1920x1080 desktop
