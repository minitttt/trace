import { streamGroqTutorQuestion, isGroqConfigured, type TutorQuestionInput } from "@/lib/providers/groq";
import { streamTutorQuestion as streamMistralTutorQuestion } from "@/lib/providers/mistral";

export async function streamTutorQuestion(input: TutorQuestionInput) {
  if (isGroqConfigured()) {
    try {
      return await streamGroqTutorQuestion(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Groq error";
      console.warn("Groq tutor request failed; trying the configured fallback provider:", message);
    }
  }

  return streamMistralTutorQuestion(input);
}
