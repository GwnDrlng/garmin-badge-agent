import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 10 * * *", // 6am EDT / 5am EST — 10:00 UTC daily (Vercel cron is fixed-UTC)
  markdown:
    "Run today's Garmin badge check following your instructions. Call get_badges first, then " +
    "compose the single Slack message (new badges, consecutive-day streak watch, badge tracker " +
    "for repeatable badges being re-earned, joined challenges, recently earned), call " +
    "post_to_slack once, and finally call record_seen_badges after the post succeeds.",
});
