import { PluggyClient } from "pluggy-sdk";

export function getPluggyClient(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET precisam estar definidos no ambiente.",
    );
  }
  return new PluggyClient({ clientId, clientSecret });
}
