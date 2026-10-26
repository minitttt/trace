import { GoogleGenAI } from "@google/genai";
import { sourceAnalysisSchema, type SourceAnalysis, type SourceType } from "@/lib/types";

const DEFAULT_GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

function getGeminiModels() {
  const configured = process.env.TRACE_GEMINI_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_GEMINI_MODELS;
}

function getGemini() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1] ?? text;
}

const analysisPrompt = (sourceType: SourceType, publicUrl?: string) =>
  `
You are Trace's source analyst. Analyze the ${sourceType} source and return only valid JSON.
${publicUrl ? `The source is publicly available at this URL: ${publicUrl}. Use it as the source reference if it is accessible.` : "The source is attached to this request."}

Return an object with exactly these keys:
{
  "title": string,
  "sourceType": "${sourceType}",
  "summary": string,
  "transcript": [{"text": string, "startSeconds": number?, "endSeconds": number?}],
  "chapters": [{"title": string, "description": string, "startSeconds": number?}],
  "keyConcepts": [{"term": string, "explanation": string}],
  "importantExamples": [string]
}

For a video, include timestamps when available. For a PDF, represent meaningful sections as transcript items without timestamps.
Be faithful to the source. Do not invent quotations, chapters, or facts that are not supported by the source.
`.trim();

async function waitForUploadedFile(ai: GoogleGenAI, fileName: string) {
  let file = await withTimeout(ai.files.get({ name: fileName }), 30_000);
  for (let attempt = 0; attempt < 90 && file.state === "PROCESSING"; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await withTimeout(ai.files.get({ name: fileName }), 30_000);
  }
  if (file.state === "FAILED") throw new Error("Gemini could not process the uploaded source");
  if (file.state !== "ACTIVE" || !file.uri || !file.mimeType)
    throw new Error("Gemini source processing timed out");
  return file;
}

export type PreparedSourcePart = {
  type: "video" | "document";
  uri: string;
  mime_type?: string;
};

export async function uploadSourceFile(input: {
  bytes: Buffer;
  mimeType?: string;
  fileName?: string;
}) {
  const ai = getGemini();
  const uploaded = await withTimeout(
    ai.files.upload({
      file: new Blob([new Uint8Array(input.bytes)], {
        type: input.mimeType ?? "application/octet-stream",
      }),
      config: { mimeType: input.mimeType, displayName: input.fileName },
    }),
    120_000,
  );
  if (!uploaded.name) throw new Error("Gemini did not return an uploaded file reference");
  return uploaded.name;
}

export async function waitForUploadedSource(input: {
  fileName: string;
  sourceType: SourceType;
}): Promise<PreparedSourcePart> {
  const readyFile = await waitForUploadedFile(getGemini(), input.fileName);
  return {
    type: input.sourceType === "pdf" ? "document" : "video",
    uri: readyFile.uri!,
    mime_type: readyFile.mimeType!,
  };
}

async function runBackgroundInteraction(
  ai: GoogleGenAI,
  model: string,
  input: Array<
    | { type: "video"; uri: string; mime_type?: string }
    | { type: "document"; uri: string; mime_type?: string }
    | { type: "text"; text: string }
  >,
) {
  let interaction = await withTimeout(
    ai.interactions.create({
      model,
      input,
      background: true,
      store: true,
      stream: false,
    }),
    30_000,
  );

  for (let attempt = 0; attempt < 36; attempt += 1) {
    if (interaction.status === "completed") return interaction;
    if (["failed", "cancelled", "incomplete", "budget_exceeded"].includes(interaction.status)) {
      throw new Error(`Gemini interaction ended with status: ${interaction.status}`);
    }
    if (!interaction.id) throw new Error("Gemini did not return an interaction ID");

    await new Promise((resolve) => setTimeout(resolve, 5_000));
    interaction = await withTimeout(ai.interactions.get(interaction.id, { stream: false }), 30_000);
  }

  throw new Error("Gemini source analysis timed out");
}

function isRetryableProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /high demand|temporarily unavailable|rate limit|quota|resource exhausted|currently unavailable|not found|no longer available|timed out|timeout|deadline|status: failed|status: incomplete/i.test(
    message,
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function analyzeSource(input: {
  sourceType: SourceType;
  bytes?: Buffer;
  mimeType?: string;
  fileName?: string;
  publicUrl?: string;
}): Promise<SourceAnalysis> {
  let sourcePart: PreparedSourcePart | undefined;

  if (input.publicUrl) {
    sourcePart = { type: "video", uri: input.publicUrl };
  } else if (input.bytes) {
    const fileName = await uploadSourceFile({
      bytes: input.bytes,
      mimeType: input.mimeType,
      fileName: input.fileName,
    });
    sourcePart = await waitForUploadedSource({ fileName, sourceType: input.sourceType });
  }

  if (!sourcePart) throw new Error("No source was provided to Gemini");

  return analyzePreparedSource({
    sourceType: input.sourceType,
    sourcePart,
    publicUrl: input.publicUrl,
  });
}

export async function analyzePreparedSource(input: {
  sourceType: SourceType;
  sourcePart: PreparedSourcePart;
  publicUrl?: string;
}): Promise<SourceAnalysis> {
  const ai = getGemini();

  let lastError: unknown;
  for (const model of getGeminiModels()) {
    try {
      const interaction = await runBackgroundInteraction(ai, model, [
        input.sourcePart,
        { type: "text", text: analysisPrompt(input.sourceType, input.publicUrl) },
      ]);
      const text = interaction.output_text?.trim();
      if (!text) throw new Error("Gemini returned an empty source analysis");
      return sourceAnalysisSchema.parse(JSON.parse(extractJson(text)));
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error)) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini is temporarily unavailable");
}
