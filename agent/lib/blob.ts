import { get, put } from "@vercel/blob";

// All state (Garmin OAuth tokens, seen-badge ids) is private-access Blob —
// tokens must never be reachable by URL.
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  try {
    const blob = await get(pathname, { access: "private" });
    if (!blob) return null;
    return (await new Response(blob.stream).json()) as T;
  } catch {
    return null; // BlobNotFoundError → treat as empty
  }
}

export async function writeJsonBlob(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60, // don't serve yesterday's state to today's run
  });
}
