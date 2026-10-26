import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "trace",
  // Checkpoint before Vercel's 300-second function ceiling so long steps can
  // continue asynchronously instead of being killed with the request.
  checkpointing: { maxRuntime: "180s" },
});
