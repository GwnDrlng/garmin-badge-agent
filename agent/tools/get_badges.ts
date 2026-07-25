import { defineTool } from "eve/tools";
import { z } from "zod";
import { readJsonBlob } from "#lib/blob.ts";
import { garminGet } from "#lib/garmin.ts";
import {
  AVAILABLE_BADGES_URL,
  EARNED_BADGES_URL,
  JOINED_CHALLENGES_URL,
  SEEN_BADGES_BLOB_PATH,
  badgeDetailUrl,
  trimBadge,
  trimChallenge,
  type RawBadge,
  type RawChallenge,
  type SeenBadges,
} from "#lib/badges.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default defineTool({
  description:
    "Fetch the user's Garmin Connect badge status: badges newly available since the last run, " +
    "in-progress badges (with progress/target values), repeatable earned badges currently being " +
    "re-earned (e.g. 10K a Day at 9/30), joined badge challenges, and badges earned in the last " +
    "7 days. Call this once, first, every run. Makes no state changes.",
  inputSchema: z.object({}),
  async execute() {
    const [available, earned, joinedChallenges] = await Promise.all([
      garminGet<RawBadge[]>(AVAILABLE_BADGES_URL),
      garminGet<RawBadge[]>(EARNED_BADGES_URL),
      garminGet<RawChallenge[]>(JOINED_CHALLENGES_URL),
    ]);

    // Repeatable badges (limit > 1) show only their LAST completed earn in the
    // earned list; live re-earn progress is only on the per-badge detail view.
    // Small fanout: ~a dozen repeatables for a typical account.
    const repeatables = earned.filter((b) => (b.badgeLimitCount ?? 1) > 1);
    const details = await Promise.all(
      repeatables.map((b) => garminGet<RawBadge>(badgeDetailUrl(b.badgeId))),
    );
    const repeatInProgress = details.filter(
      (d) =>
        (d.badgeProgressValue ?? 0) > 0 &&
        d.badgeTargetValue != null &&
        d.badgeProgressValue! < d.badgeTargetValue,
    );

    const seen = await readJsonBlob<SeenBadges>(SEEN_BADGES_BLOB_PATH);
    const seenIds = new Set(seen?.ids ?? []);
    const isBaselineRun = seen === null;

    return {
      // First ever run: everything is "new", so store a baseline instead of spamming.
      isBaselineRun,
      availableCount: available.length,
      newBadges: isBaselineRun
        ? []
        : available.filter((b) => !seenIds.has(b.badgeId)).map(trimBadge),
      inProgressBadges: available
        .filter((b) => (b.badgeProgressValue ?? 0) > 0)
        .map(trimBadge),
      repeatBadgesInProgress: repeatInProgress.map(trimBadge),
      joinedChallenges: joinedChallenges.map(trimChallenge),
      recentlyEarned: earned
        .filter(
          (b) =>
            b.badgeEarnedDate && Date.now() - Date.parse(b.badgeEarnedDate) < WEEK_MS,
        )
        .map(trimBadge),
    };
  },
});
