import { getLanguageCode } from "@/lib/constants";

interface ElevenLabsSpeechOptions {
  text: string;
  speaker: "Leo" | "Maya";
  language?: string;
  previousText?: string;
  nextText?: string;
}

// Leo stays on the existing conversational voice. Maya uses a warmer guide voice
// so her delivery feels like a human explainer instead of a generic narrator.
const DEFAULT_VOICES = {
  Leo: process.env.ELEVENLABS_VOICE_LEO || "ErXwobaYiN019PkySvjV",
  Maya: process.env.ELEVENLABS_VOICE_MAYA || "OZ0L6eISlOejga3XjDFt",
};
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";

export async function synthesizeElevenLabsAudio({
  text,
  speaker,
  language,
  previousText,
  nextText,
}: ElevenLabsSpeechOptions): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = DEFAULT_VOICES[speaker] || DEFAULT_VOICES.Leo;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      language_code: getLanguageCode(language ?? "English"),
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.78,
        style: 0,
        use_speaker_boost: true,
        speed: 0.98,
      },
      ...(previousText ? { previous_text: previousText.slice(-100) } : {}),
      ...(nextText ? { next_text: nextText.slice(0, 100) } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(`ElevenLabs API error (${response.status}):`, errorText);
    return null;
  }

  return response.arrayBuffer();
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}
