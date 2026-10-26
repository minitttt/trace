import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isElevenLabsConfigured, synthesizeElevenLabsAudio } from "@/lib/elevenlabs";

const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(2500),
  speaker: z.enum(["Leo", "Maya"]).default("Leo"),
  language: z.string().trim().min(2).max(40).default("English"),
  previousText: z.string().max(100).optional(),
  nextText: z.string().max(100).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    configured: isElevenLabsConfigured(),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isElevenLabsConfigured()) {
    return NextResponse.json(
      { error: "Enhanced audio is not available right now", fallback: true },
      { status: 400 },
    );
  }

  try {
    const parsedBody = ttsRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    const { text, speaker, language, previousText, nextText } = parsedBody.data;
    const audioBuffer = await synthesizeElevenLabsAudio({
      text,
      speaker,
      language,
      previousText,
      nextText,
    });

    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Could not generate audio right now", fallback: true },
        { status: 502 },
      );
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not generate audio right now", fallback: true },
      { status: 500 },
    );
  }
}
