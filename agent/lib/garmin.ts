import garmin from "garmin-connect"; // CJS module — no named exports at runtime
import { readJsonBlob, writeJsonBlob } from "#lib/blob.ts";

const { GarminConnect } = garmin;
type GC = InstanceType<typeof GarminConnect>;

export const TOKENS_BLOB_PATH = "garmin/tokens.json";

interface StoredTokens {
  oauth1: unknown;
  oauth2: unknown;
  savedAt: string;
}

async function freshLogin(gc: GC): Promise<void> {
  if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
    throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD are not set");
  }
  await gc.login();
  // Persist so subsequent runs restore the session instead of re-doing SSO
  // (Garmin rate-limits repeated logins). OAuth1 lasts ~1 year and is used by
  // the lib to refresh the short-lived OAuth2 token automatically.
  await writeJsonBlob(TOKENS_BLOB_PATH, {
    oauth1: gc.client.oauth1Token,
    oauth2: gc.client.oauth2Token,
    savedAt: new Date().toISOString(),
  } satisfies StoredTokens);
}

let gcPromise: Promise<GC> | null = null;

async function connect(): Promise<GC> {
  const gc = new GarminConnect({
    username: process.env.GARMIN_EMAIL ?? "",
    password: process.env.GARMIN_PASSWORD ?? "",
  });
  const stored = await readJsonBlob<StoredTokens>(TOKENS_BLOB_PATH);
  if (stored?.oauth1 && stored?.oauth2) {
    // ponytail: loadToken's param types are the lib's internal interfaces; the
    // objects round-trip through JSON unchanged, so the cast is safe.
    gc.loadToken(stored.oauth1 as never, stored.oauth2 as never);
  } else {
    await freshLogin(gc);
  }
  return gc;
}

/** Authenticated GET against any Garmin Connect API URL. Falls back to one
 *  fresh email/password login if the restored tokens turn out to be stale. */
export async function garminGet<T>(url: string): Promise<T> {
  const gc = await (gcPromise ??= connect());
  try {
    return (await gc.get(url)) as T;
  } catch {
    await freshLogin(gc);
    return (await gc.get(url)) as T;
  }
}
