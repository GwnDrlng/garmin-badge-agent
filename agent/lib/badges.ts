export const SEEN_BADGES_BLOB_PATH = "garmin/seen-badges.json";

export const AVAILABLE_BADGES_URL =
  "https://connectapi.garmin.com/badge-service/badge/available";
export const EARNED_BADGES_URL =
  "https://connectapi.garmin.com/badge-service/badge/earned";
export const JOINED_CHALLENGES_URL =
  "https://connectapi.garmin.com/badgechallenge-service/badgeChallenge/non-completed";
export const badgeDetailUrl = (badgeId: number) =>
  `https://connectapi.garmin.com/badge-service/badge/detail/v2/${badgeId}`;

export interface SeenBadges {
  ids: number[];
  updatedAt: string;
}

// Unofficial API — keep the raw shape loose and pick fields defensively.
export interface RawBadge {
  badgeId: number;
  badgeName?: string;
  badgeKey?: string;
  badgePoints?: number;
  badgeProgressValue?: number | null;
  badgeTargetValue?: number | null;
  badgeStartDate?: string | null;
  badgeEndDate?: string | null;
  badgeEarnedDate?: string | null;
  badgeEarnedNumber?: number | null;
  badgeLimitCount?: number | null;
  badgeSeriesId?: number | null;
  badgeTypeIds?: number[] | null;
}

export interface RawChallenge {
  badgeId: number;
  badgeChallengeName?: string;
  badgeKey?: string;
  badgePoints?: number;
  badgeProgressValue?: number | null;
  badgeTargetValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  userJoined?: boolean | null;
}

export const trimBadge = (b: RawBadge) => ({
  id: b.badgeId,
  name: b.badgeName ?? b.badgeKey ?? `badge-${b.badgeId}`,
  // The key encodes what the badge actually requires (e.g. nutrition_day_log_weight,
  // steps_30day_10000) — far more reliable than guessing from the display name.
  key: b.badgeKey ?? null,
  points: b.badgePoints ?? 0,
  progress: b.badgeProgressValue ?? null,
  target: b.badgeTargetValue ?? null,
  start: b.badgeStartDate ?? null,
  end: b.badgeEndDate ?? null,
  earnedDate: b.badgeEarnedDate ?? null,
  timesEarned: b.badgeEarnedNumber ?? null,
});

export const trimChallenge = (c: RawChallenge) => ({
  id: c.badgeId,
  name: c.badgeChallengeName ?? c.badgeKey ?? `challenge-${c.badgeId}`,
  key: c.badgeKey ?? null,
  points: c.badgePoints ?? 0,
  progress: c.badgeProgressValue ?? null,
  target: c.badgeTargetValue ?? null,
  start: c.startDate ?? null,
  end: c.endDate ?? null,
});
