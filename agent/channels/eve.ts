import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Shared-secret access for manually triggering the deployed agent
    // (e.g. `curl -u test:$ROUTE_AUTH_BASIC_PASSWORD .../eve/v1/session`).
    httpBasic({
      username: process.env.ROUTE_AUTH_BASIC_USER ?? "test",
      password: process.env.ROUTE_AUTH_BASIC_PASSWORD!,
    }),
  ],
});
