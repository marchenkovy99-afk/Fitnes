# Fitness redesign and custom workouts implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the approved warm light/charcoal/coral mobile diary design and support named workouts beyond A/B.
**Architecture:** Keep version-1 JSON state and existing Supabase CAS storage. Generalize plan validation and selectors; add a focused workout editor module. Preserve snapshots, weights, statuses, existing exercise data and the graffiti app icon.
**Tech Stack:** Browser JavaScript modules, CSS, esbuild, node:test, existing Supabase client.
**Spec:** User-approved three-screen visual concept and request for additional workouts in this conversation.

## Global Constraints
- Square images with contain, 16px inputs, pinch zoom preserved; no interaction scaling.
- Light/dark follows device by default with a local user override.
- Existing A/B workouts and completed history must survive restoration and synchronization.
- No schema, account or authentication changes; no new dependencies.
- Dynamic workout selection, exercise creation and history must accept every valid workout ID.

## Review Focus
- Old A/B-only backups must still restore without loss.
- Custom-plan weights and history must survive cloud serialization.
- Remote copy may not contain the locally selected custom plan; choose a valid fallback.
- Long Russian workout/exercise names and many workouts must fit small screens.
- Empty new workouts need clear add-exercise actions and cannot be completed.

### Task 1: Dynamic workout model
Files: model.js, sync.js, tests/model.test.js, tests/sync.test.js.
Interfaces: saveWorkout(state,{id?,name,focus,items}) -> id; existing weight/status/history functions accept safe dynamic IDs.
- [x] Add failing tests for custom workout create/edit, validation without mutation, old-data restore, custom weights/history roundtrip, and remote selected-plan fallback.
- [x] Generalize restoreState over all plans, validate IDs and prescriptions, implement saveWorkout and reject empty completion.
- [x] Run npm test; expected all tests pass.

### Task 2: Approved diary UI and workout editor
Files: app.js, workout-editor.js (new), styles.css, calendar.js, index.html, scripts/build.mjs.
Interfaces: workout editor receives state/current draft and renders form; submit calls saveWorkout. Existing persistence and cloud markChanged paths remain.
- [x] Replace training layout with compact square-cover rows, inline weight, one primary done checkbox, and secondary skip in detail.
- [x] Add dynamic selector, visible New workout action, editable name/focus and existing-exercise selection with per-workout sets/reps and order controls.
- [x] Style library/detail/forms/history/cloud coherently; calendar shows neutral day dots and selected workout previews.
- [x] Add auto/light/dark theme controls and early theme initialization.
- [x] Add model/renderer tests for dynamic selections and empty workout UX; run npm test, npm run check and npm run build.

### Task 3: Review and publish
- [x] Review data preservation and event paths; verify generated build contains new editor and theme assets.
- [x] Use available browser QA only within supported Sites environment; report if unavailable.
- [x] Publish same source to existing GitHub main and existing private Site. Confirm Pages CI and Sites deployment success.

## Verification record
- Model and controller tests cover custom program creation, named selectors, weights, completion and history. Legacy leading-zero sets regression fixed.
- Fresh independent code review found no outstanding important defects.
- Browser layout QA unavailable: managed Sites requires control-browser, which is not installed. No browser preview was started.
- Source helpers and GitHub Pages CI used for publication; deployment results recorded in conversation.
