import { Mistral } from "@mistralai/mistralai";
import {
  completeGroqJson,
  isGroqConfigured,
  transcribeWithGroq,
  type TranscriptionResult,
} from "@/lib/providers/groq";
import { sourceAnalysisSchema, type SourceAnalysis, type SourceType } from "@/lib/types";

const MISTRAL_OCR_MODEL = process.env.TRACE_MISTRAL_OCR_MODEL || "mistral-ocr-latest";
const MISTRAL_TRANSCRIPTION_MODEL =
  process.env.TRACE_MISTRAL_TRANSCRIPTION_MODEL || "voxtral-mini-latest";
const MAX_FALLBACK_SOURCE_CHARS = 160_000;

function getMistral() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");
  return new Mistral({ apiKey });
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1] ?? text;
}

function trimSource(text: string) {
  if (text.length <= MAX_FALLBACK_SOURCE_CHARS) return text;
  return `${text.slice(0, MAX_FALLBACK_SOURCE_CHARS)}\n\n[Source truncated for fallback processing.]`;
}

function sourceAnalysisPrompt(sourceType: SourceType, sourceText: string, fileName?: string) {
  return `
You are Trace's source analyst. Build a faithful structured analysis from the extracted ${sourceType} content below.
${fileName ? `Original file name: ${fileName}` : ""}

Return only valid JSON with exactly this shape:
{
  "title": string,
  "sourceType": "${sourceType}",
  "summary": string,
  "transcript": [{"text": string, "startSeconds": number?, "endSeconds": number?}],
  "chapters": [{"title": string, "description": string, "startSeconds": number?}],
  "keyConcepts": [{"term": string, "explanation": string}],
  "importantExamples": [string]
}

For a PDF, represent meaningful pages or sections as transcript items without timestamps.
For a video, preserve timestamps when they are present in the transcript.
Be faithful to the extracted content. Do not invent facts, quotations, chapters, or timestamps.

Extracted source:
${trimSource(sourceText)}
`.trim();
}

async function extractPdfTextWithMistral(input: {
  bytes: Buffer;
  mimeType?: string;
  fileName?: string;
}) {
  const client = getMistral();
  const uploaded = await client.files.upload({
    file: {
      fileName: input.fileName ?? "source.pdf",
      content: new Blob([new Uint8Array(input.bytes)], {
        type: input.mimeType ?? "application/pdf",
      }),
    },
    purpose: "ocr",
  });
  const response = await client.ocr.process({
    model: MISTRAL_OCR_MODEL,
    document: { type: "file", fileId: uploaded.id },
    includeImageBase64: false,
    tableFormat: "markdown",
  });
  const text = response.pages
    .map((page) => `Page ${page.index + 1}\n${page.markdown}`)
    .join("\n\n")
    .trim();
  if (!text) throw new Error("Mistral OCR returned an empty PDF");
  return text;
}

async function transcribeWithMistral(input: {
  bytes: Buffer;
  mimeType?: string;
  fileName?: string;
}): Promise<TranscriptionResult> {
  const client = getMistral();
  const response = await client.audio.transcriptions.complete({
    model: MISTRAL_TRANSCRIPTION_MODEL,
    file: {
      fileName: input.fileName ?? "source.mp4",
      content: new Blob([new Uint8Array(input.bytes)], {
        type: input.mimeType ?? "video/mp4",
      }),
    },
    timestampGranularities: ["segment"],
  });
  if (!response.text?.trim()) throw new Error("Mistral returned an empty transcription");
  return {
    text: response.text.trim(),
    segments: (response.segments ?? []).map((segment) => ({
      text: segment.text,
      startSeconds: segment.start,
      endSeconds: segment.end,
    })),
  };
}

function transcriptionText(transcription: TranscriptionResult) {
  if (transcription.segments.length === 0) return transcription.text;
  return transcription.segments
    .map((segment) => {
      const timestamp =
        typeof segment.startSeconds === "number" ? `[${segment.startSeconds.toFixed(1)}s] ` : "";
      return `${timestamp}${segment.text}`;
    })
    .join("\n");
}

async function structureSourceWithMistral(
  sourceType: SourceType,
  sourceText: string,
  fileName?: string,
) {
  const client = getMistral();
  const response = await client.chat.complete({
    model: process.env.TRACE_MISTRAL_MODEL || "mistral-small-latest",
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Trace's source analyst. Return only valid JSON matching the requested schema.",
      },
      { role: "user", content: sourceAnalysisPrompt(sourceType, sourceText, fileName) },
    ],
  });
  const content = response.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  if (!text.trim()) throw new Error("Mistral returned an empty source analysis");
  return sourceAnalysisSchema.parse(JSON.parse(extractJson(text)));
}

async function structureSourceWithGroq(
  sourceType: SourceType,
  sourceText: string,
  fileName?: string,
) {
  const text = await completeGroqJson({
    system: "You are Trace's source analyst. Return only valid JSON matching the requested schema.",
    prompt: sourceAnalysisPrompt(sourceType, sourceText, fileName),
    maxCompletionTokens: 5_000,
  });
  return sourceAnalysisSchema.parse(JSON.parse(extractJson(text)));
}

export async function analyzeSourceWithFallback(input: {
  sourceType: SourceType;
  bytes: Buffer;
  mimeType?: string;
  fileName?: string;
}): Promise<SourceAnalysis> {
  if (input.sourceType === "pdf") {
    const extractedText = await extractPdfTextWithMistral(input);
    try {
      return await structureSourceWithMistral("pdf", extractedText, input.fileName);
    } catch (error) {
      if (!isGroqConfigured()) throw error;
      console.warn("Mistral PDF structuring failed; using Groq fallback", {
        message: error instanceof Error ? error.message : String(error),
      });
      return structureSourceWithGroq("pdf", extractedText, input.fileName);
    }
  }

  let transcription: TranscriptionResult;
  try {
    if (!isGroqConfigured()) throw new Error("GROQ_API_KEY is not configured");
    transcription = await transcribeWithGroq(input);
  } catch (groqError) {
    if (!process.env.MISTRAL_API_KEY) throw groqError;
    console.warn("Groq video transcription failed; trying Mistral transcription", {
      message: groqError instanceof Error ? groqError.message : String(groqError),
    });
    transcription = await transcribeWithMistral(input);
  }

  const extractedText = transcriptionText(transcription);
  try {
    if (!process.env.MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not configured");
    return await structureSourceWithMistral("video", extractedText, input.fileName);
  } catch (mistralError) {
    if (!isGroqConfigured()) throw mistralError;
    console.warn("Mistral video structuring failed; using Groq fallback", {
      message: mistralError instanceof Error ? mistralError.message : String(mistralError),
    });
    return structureSourceWithGroq("video", extractedText, input.fileName);
  }
}
