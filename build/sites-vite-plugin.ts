import type { Plugin } from "vite";

// No-op placeholder for the OpenAI Site Creator preview plugin, which this
// standalone deployment does not use.
export function sites(): Plugin {
  return { name: "sites-noop" };
}
