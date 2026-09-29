import { defineTool } from "eve/tools";
import { z } from "zod";
import { writeJsonBlob } from "#lib/blob.ts";
import { garminGet } from "#lib/garmin.ts";
import {
  AVAILABLE_BADGES_URL,
  SEEN_BADGES_BLOB_PATH,
  type RawBadge,
} from "#lib/badges.ts";

export default defineTool({
  description:
    "Record the currently available Garmin badge ids as 'seen', so the next run only reports " +
    "genuinely new badges. Call this once, AFTER the Slack post has succeeded.",
  inputSchema: z.object({}),
  async execute() {
    // Dry-run must never write state, even if the model calls this anyway.
    if (process.env.BADGE_DRY_RUN === "1") return { recorded: 0, dryRun: true };
    // Refetch rather than trusting the model to echo back ~100 ids verbatim.
    const available = await garminGet<RawBadge[]>(AVAILABLE_BADGES_URL);
    await writeJsonBlob(SEEN_BADGES_BLOB_PATH, {
      ids: available.map((b) => b.badgeId),
      updatedAt: new Date().toISOString(),
    });
    return { recorded: available.length };
  },
});
