#!/usr/bin/env node
// One-time local setup: logs in to Garmin Connect with email/password and
// pushes the OAuth tokens to Vercel Blob, so the deployed agent restores the
// session instead of doing SSO logins from Vercel IPs (which Garmin may block).
// Re-run this if the agent ever reports its Garmin tokens went stale.
//
// Never deployed — eve only discovers files under agent/, this lives outside it.
//
// Usage: node --env-file=.env.local scripts/seed-garmin-tokens.mjs
// Requires GARMIN_EMAIL, GARMIN_PASSWORD, BLOB_READ_WRITE_TOKEN in the env
// (`vercel env pull .env.local` first for the Blob token).

import garmin from "garmin-connect"; // CJS module — no named exports at runtime
import { put } from "@vercel/blob";

const { GarminConnect } = garmin;

const TOKENS_BLOB_PATH = "garmin/tokens.json";

for (const name of ["GARMIN_EMAIL", "GARMIN_PASSWORD", "BLOB_READ_WRITE_TOKEN"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name} — run with: node --env-file=.env.local scripts/seed-garmin-tokens.mjs`);
    process.exit(1);
  }
}

const gc = new GarminConnect({
  username: process.env.GARMIN_EMAIL,
  password: process.env.GARMIN_PASSWORD,
});

console.log("Logging in to Garmin Connect…");
await gc.login();

await put(
  TOKENS_BLOB_PATH,
  JSON.stringify(
    {
      oauth1: gc.client.oauth1Token,
      oauth2: gc.client.oauth2Token,
      savedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  },
);

console.log(`Login OK — tokens saved to Blob at ${TOKENS_BLOB_PATH}.`);
console.log("The deployed agent will restore this session on every run.");
