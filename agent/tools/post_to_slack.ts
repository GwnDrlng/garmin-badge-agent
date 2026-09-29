import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Post a message to the configured Slack channel via the incoming webhook.",
  inputSchema: z.object({ text: z.string().min(1) }),
  async execute({ text }) {
    // Dry-run: don't spam the channel while testing.
    if (process.env.BADGE_DRY_RUN === "1") return { posted: false, dryRun: true, text };
    const res = await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
    return { posted: true };
  },
});
