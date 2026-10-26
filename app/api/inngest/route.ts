import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processLesson } from "@/lib/process-lesson";

// Inngest recommends a 300-second ceiling for the Vercel serve endpoint.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processLesson],
});
