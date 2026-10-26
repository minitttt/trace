import type { LearningMaterial, SourceAnalysis } from "@/lib/types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.TRACE_GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_TRANSCRIPTION_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIPTION_MODEL =
  process.env.TRACE_GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TutorQuestionInput = {
  question: string;
  analysis: SourceAnalysis;
  material: LearningMaterial;
  history: TutorMessage[];
};

function tutorSystemPrompt(input: TutorQuestionInput) {
  return `You are Trace's patient tutor. Answer the learner's current question directly and differently from earlier answers when the question changes. Use only the supplied lesson context. If the answer is not supported, say that clearly and suggest where the learner can look. Keep the response clear, practical, and concise. Do not repeat a previous answer unless the learner asks you to explain it again.

Lesson context:
${JSON.stringify({ analysis: input.analysis, material: input.material })}`;
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function completeGroqJson(input: {
  system: string;
  prompt: string;
  maxCompletionTokens?: number;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: input.maxCompletionTokens ?? 4_000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "Unknown Groq error");
    throw new Error(`Groq request failed (${response.status}): ${details.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned an empty response");
  }
  return content.trim();
}

export type TranscriptionResult = {
  text: string;
  segments: Array<{ text: string; startSeconds?: number; endSeconds?: number }>;
};

export async function transcribeWithGroq(input: {
  bytes: Buffer;
  mimeType?: string;
  fileName?: string;
}): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.bytes)], {
      type: input.mimeType ?? "video/mp4",
    }),
    input.fileName ?? "source.mp4",
  );
  form.append("model", GROQ_TRANSCRIPTION_MODEL);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const response = await fetch(GROQ_TRANSCRIPTION_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "Unknown Groq transcription error");
    throw new Error(`Groq transcription failed (${response.status}): ${details.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    text?: unknown;
    segments?: Array<{ text?: unknown; start?: unknown; end?: unknown }>;
  };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) throw new Error("Groq returned an empty transcription");

  return {
    text,
    segments: (payload.segments ?? [])
      .filter((segment) => typeof segment.text === "string" && segment.text.trim())
      .map((segment) => ({
        text: String(segment.text).trim(),
        startSeconds: typeof segment.start === "number" ? segment.start : undefined,
        endSeconds: typeof segment.end === "number" ? segment.end : undefined,
      })),
  };
}

export async function streamGroqTutorQuestion(
  input: TutorQuestionInput,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.45,
      max_completion_tokens: 900,
      reasoning_effort: "low",
      reasoning_format: "hidden",
      stream: true,
      messages: [
        { role: "system", content: tutorSystemPrompt(input) },
        ...input.history,
        { role: "user", content: input.question },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const details = await response.text().catch(() => "Unknown Groq error");
    throw new Error(`Groq tutor request failed (${response.status}): ${details.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let closed = false;

      const handleLine = (line: string) => {
        if (closed || !line.startsWith("data:")) return;
        const payload = line.slice(5).trim();
        if (!payload) return;
        if (payload === "[DONE]") {
          closed = true;
          controller.close();
          return;
        }

        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: unknown } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          controller.enqueue(encoder.encode(delta));
        }
      };

      try {
        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) handleLine(line);
        }

        if (!closed) {
          buffer += decoder.decode();
          if (buffer) handleLine(buffer);
        }
        if (!closed) controller.close();
      } catch (error) {
        if (!closed) controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}
