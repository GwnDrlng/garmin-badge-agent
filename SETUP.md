# My setup checklist

Condensed from the [README](README.md) — full details and troubleshooting live there.
This repo is a personal copy of [mthistle/garmin-badge-agent](https://github.com/mthistle/garmin-badge-agent).

## One-time setup (~20 min)

- [ ] **Clone locally & install** — needs Node 24: `git clone git@github.com:GwnDrlng/garmin-badge-agent.git && cd garmin-badge-agent && npm install`
- [ ] **Vercel project** — `npm i -g vercel && vercel login && vercel link` (create a new project named `garmin-badge-agent`)
- [ ] **Blob store** — Vercel dashboard → project → Storage → Create/Connect Blob store, then `vercel env pull .env.local`
- [ ] **Slack webhook** — create a Slack app at https://api.slack.com/apps → enable *Incoming Webhooks* → *Add New Webhook to Workspace* → pick the channel (e.g. a private `#garmin` channel or your own DM) → copy the URL into `SLACK_WEBHOOK_URL`
- [ ] **Ollama Cloud key** — https://ollama.com/settings/keys → `OLLAMA_API_KEY` (this is the LLM that writes the daily message)
- [ ] **Garmin credentials** — `GARMIN_EMAIL` / `GARMIN_PASSWORD` in `.env.local`. ⚠️ MFA/two-factor must be OFF on the Garmin account — the library can't answer MFA challenges.
- [ ] **Route password** — set `ROUTE_AUTH_BASIC_PASSWORD` to any secret you choose
- [ ] **Push env vars to Vercel** — `for v in OLLAMA_API_KEY SLACK_WEBHOOK_URL GARMIN_EMAIL GARMIN_PASSWORD ROUTE_AUTH_BASIC_PASSWORD; do vercel env add "$v" production; done`
- [ ] **Seed Garmin tokens** (once, from your own machine, not a server): `node --env-file=.env.local scripts/seed-garmin-tokens.mjs`
- [ ] **Dry-run locally** — set `BADGE_DRY_RUN=1` in `.env.local`, then `npm run dev` and in another terminal `curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily-badges`
- [ ] **Real test** — remove `BADGE_DRY_RUN`, re-trigger, confirm the message lands in Slack
- [ ] **Deploy** — `vercel deploy --prod`, then check `https://<your-app>.vercel.app/eve/v1/health`

After deploy the report arrives **every day at 10:00 UTC** (6am EDT / 5am EST) automatically.

## Change the delivery time

Edit the cron in [`agent/schedules/daily-badges.ts`](agent/schedules/daily-badges.ts) — it's fixed UTC.
Example: `"0 13 * * *"` = 9am EDT. Redeploy after changing.

## If it stops working

See [README → Troubleshooting](README.md#troubleshooting). Most common: Garmin tokens expired (~1 year) → re-run the seed script.
