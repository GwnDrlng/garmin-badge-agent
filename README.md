# garmin-badge-agent — Garmin Badge Watcher

A tiny [Vercel Eve](https://vercel.com/eve) agent that checks your Garmin Connect account once a day and posts a single Slack message with:

- **🆕 New badges** — badges Garmin made available since the last run (seasonal challenges, new series, etc.)
- **🔥 Streak watch** — anything requiring *consecutive days* where you already have more than one day banked — a reminder before you accidentally break the streak
- **📊 Badge tracker** — live progress on repeatable badges you're re-earning (Garmin hides this: the earned list shows only your *last completed* earn, so the agent fetches per-badge detail for repeatables)
- **🎯 Joined challenges** — status of badge challenges you've joined: active ones with days left, upcoming ones with start dates
- **🏅 Recently earned** — anything you unlocked in the last week

Example message:

> **🔥 Streak watch**
> • 10K a Day Challenge — 9/30 days. Hit 10,000 steps today to keep it alive.
> • 60-Day Goal Getter — 9/60 days. Meet your step goal today.
>
> **📊 Badge tracker**
> • Run Streak — 1/30 (earn #2): run a mile 30 days in a row
>
> **🎯 Joined challenges**
> • July Weekend Walking — active, ends today
> • July Weekend 10K — starts Jul 17
>
> **🏅 Recently earned**
> • Trailblazer · Hiker

## How it works

- Built on the **eve** framework: everything under `agent/` is auto-discovered — the daily cron, the HTTP routes, the tools. There is no `vercel.json`.
- A daily Vercel cron (10:00 UTC) hands the run prompt to an LLM agent (GLM 5.2 via Ollama Cloud) with three tools: `get_badges` (Garmin), `post_to_slack` (incoming webhook), `record_seen_badges` (state).
- **Garmin auth**: your email/password log in once via a local seed script; the OAuth tokens are stored in a **private Vercel Blob** and restored on every run (the long-lived OAuth1 token lasts ~a year). No credentials or tokens ever touch the repo.
- **State**: `garmin/seen-badges.json` in Blob holds the badge ids from the last run; the diff is what makes a badge "new". The first run just establishes a baseline.

> ⚠️ **Unofficial API disclaimer**: this uses the same internal endpoints the Garmin Connect app uses (`badge-service/badge/available`, `badge-service/badge/earned`) via the [garmin-connect](https://www.npmjs.com/package/garmin-connect) npm package. Garmin can change or block them at any time. Accounts with **MFA/two-factor enabled are not supported** by the underlying library.

## Quickstart

Prereqs: Node 24, a [Vercel](https://vercel.com) account, the Vercel CLI (`npm i -g vercel`), a Slack workspace where you can create an app, an [Ollama Cloud](https://ollama.com) account, and a Garmin Connect account **without MFA**.

**1. Clone and install**

```sh
git clone <this-repo> && cd garmin-badge-agent
npm install
```

**2. Create the Vercel project**

```sh
vercel login
vercel link   # create a new project, e.g. "garmin-badge-agent"
```

**3. Connect a Blob store** — in the [Vercel dashboard](https://vercel.com/dashboard): your project → **Storage** → **Create/Connect Blob store**. This auto-injects `BLOB_READ_WRITE_TOKEN` into the project. Then pull it locally:

```sh
vercel env pull .env.local
```

**4. Fill in secrets** — add the remaining values to `.env.local` (see `.env.example`). Do this *after* step 3: `vercel env pull` **overwrites** `.env.local`, so anything you filled in earlier would be lost.

| Variable | What it is | Where to get it |
|---|---|---|
| `OLLAMA_API_KEY` | The agent's LLM (GLM 5.2 on Ollama Cloud) | [ollama.com/settings/keys](https://ollama.com/settings/keys) |
| `SLACK_WEBHOOK_URL` | Incoming webhook for the channel you want messages in | [Slack: create an incoming webhook](https://api.slack.com/messaging/webhooks) |
| `GARMIN_EMAIL` / `GARMIN_PASSWORD` | Your Garmin Connect login (no MFA) | — |
| `ROUTE_AUTH_BASIC_PASSWORD` | Any secret you choose; protects manual HTTP triggering | — |
| `BLOB_READ_WRITE_TOKEN` | Blob store access | auto-filled by step 3 |

Then add each one to the deployed project too:

```sh
for v in OLLAMA_API_KEY SLACK_WEBHOOK_URL GARMIN_EMAIL GARMIN_PASSWORD ROUTE_AUTH_BASIC_PASSWORD; do
  vercel env add "$v" production
done
```

**5. Seed the Garmin session** (one-time, from your own machine):

```sh
node --env-file=.env.local scripts/seed-garmin-tokens.mjs
```

This logs in once and stores the OAuth tokens in your private Blob store. The deployed agent reuses them so Garmin never sees logins from datacenter IPs.

**6. Test locally**

```sh
npm run dev
# in another terminal — fire the daily schedule out of band
# (use the port `eve dev` prints at startup, e.g. 2000):
curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily-badges
```

Set `BADGE_DRY_RUN=1` in `.env.local` first if you want to see the run without posting to Slack; remove it and re-trigger to see the real message land in your channel.

**7. Deploy**

```sh
vercel deploy --prod
curl https://<your-app>.vercel.app/eve/v1/health
```

Done — the cron (10:00 UTC daily) is generated from `agent/schedules/daily-badges.ts` at build time.

## Day-2 operations

- **Trigger a run manually** on the deployed agent:
  ```sh
  curl -u test:$ROUTE_AUTH_BASIC_PASSWORD -X POST https://<your-app>.vercel.app/eve/v1/session \
    -H 'content-type: application/json' -d '{"message":"Run the daily badge check now."}'
  ```
- **Change the schedule**: edit the cron in `agent/schedules/daily-badges.ts` (fixed UTC) and redeploy.
- **Dry-run mode**: set `BADGE_DRY_RUN=1` (env var) — the Slack tool reports what it *would* post.

## Troubleshooting

- **"could not reach Garmin — tokens may need re-seeding"** in Slack, or 401s in logs: the stored session expired or was invalidated (password change, ~1-year OAuth1 expiry). Re-run step 5.
- **Login fails in the seed script**: check credentials, and confirm MFA is off — the `garmin-connect` library cannot answer MFA challenges.
- **Everything reported as "new" on day one**: it isn't — the first run stores a baseline and says so; alerts start on run two.
- **No Slack message at all**: check the Vercel project's cron + function logs, and `GET /eve/v1/health`.
