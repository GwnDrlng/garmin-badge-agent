# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Vercel Eve** agent that runs daily at 10:00 UTC, checks the user's Garmin Connect badges via
unofficial endpoints (`badge-service/badge/available` / `earned`), and posts one Slack message:
newly available badges (diffed against Blob state), consecutive-day "streak watch" reminders for
in-progress badges with >1 day banked, and recently earned badges. Model is GLM 5.2 (Ollama Cloud).

This project uses the **eve** framework (`eve@^0.22.5` — Vercel rejects deploys below 0.18). Before writing framework code, read the
relevant guide in `node_modules/eve/docs/`. Eve auto-discovers everything under `agent/` — there is
no manual registration and no `vercel.json`.

## Layout

- `agent/agent.ts` — model wiring (GLM 5.2 via Ollama Cloud, OpenAI-compatible provider).
- `agent/instructions.md` — persona + operating procedure (**the system prompt**; message format
  and streak-detection rules live here).
- `agent/lib/blob.ts` — private-access Blob JSON read/write helpers.
- `agent/lib/garmin.ts` — Garmin client: restores OAuth tokens from Blob (`garmin/tokens.json`),
  falls back to one fresh email/password login, exposes `garminGet(url)`.
- `agent/lib/badges.ts` — badge endpoint URLs, raw-payload types, field trimming.
- `agent/tools/` — `get_badges` (fetch + diff vs seen state, read-only), `record_seen_badges`
  (writes the seen-id set; called only after a successful Slack post), `post_to_slack` (incoming
  webhook, `BADGE_DRY_RUN=1` guard). Each default-exports `defineTool`; discovered by filename.
- `agent/schedules/daily-badges.ts` — the daily cron (`0 10 * * *`, fixed UTC) + run prompt.
- `agent/channels/eve.ts` — HTTP channel + auth (manual triggering of the deployed agent).
- `scripts/seed-garmin-tokens.mjs` — one-time local Garmin login → tokens to Blob. Never deployed.

## Commands

- `npm run dev` — run locally (`eve dev`); fire the schedule with
  `curl -X POST http://localhost:3000/eve/v1/dev/schedules/daily-badges`.
- `npm run build` / `npm start` — `eve build` / `eve start`.
- `npm run typecheck` — `tsgo` (TypeScript native preview).

## Env vars

See `.env.example`. Local dev reads `.env.local`; production reads Vercel project env vars.
Required: `OLLAMA_API_KEY`, `SLACK_WEBHOOK_URL`, `GARMIN_EMAIL`, `GARMIN_PASSWORD`,
`BLOB_READ_WRITE_TOKEN` (from the connected Blob store), `ROUTE_AUTH_BASIC_PASSWORD`.
`BADGE_DRY_RUN=1` skips the real Slack post. `VERCEL_OIDC_TOKEN` is auto-provided by Vercel.

## Notes

- Badge endpoints are **unofficial**; response fields are picked defensively in
  `agent/lib/badges.ts` (`trimBadge`). If Garmin changes the payload, fix it there.
- Garmin badge API quirks (confirmed 2026-07): **repeatable** badges (`badgeLimitCount > 1`)
  appear in `badge/earned` frozen at their last completed earn; live re-earn progress is only on
  `badge/detail/v2/{id}` (`get_badges` fans out ~a dozen detail calls for these). Joined
  challenges live at `badgechallenge-service/badgeChallenge/non-completed`. There is no
  `badge/inProgress` endpoint (404). A badge's `badgeKey` encodes its real requirement
  (e.g. `nutrition_day_log_weight`); display names are misleading — instructions.md tells the
  model to trust the key.
- Garmin auth strategy: never do SSO logins from prod if avoidable — tokens are seeded locally
  (`scripts/seed-garmin-tokens.mjs`) and restored each run; OAuth1 lasts ~1 year and refreshes
  the short-lived OAuth2 automatically. MFA accounts are unsupported (library limitation).
- Blob files (all private access): `garmin/tokens.json` (OAuth tokens — secret),
  `garmin/seen-badges.json` (available-badge id set from the last run; the new-badge diff source).
- State-write ordering: `record_seen_badges` runs only after `post_to_slack` succeeds, so a failed
  post never swallows a new-badge alert.
