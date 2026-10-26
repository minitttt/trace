import { Mistral } from "@mistralai/mistralai";
import {
  learningMaterialSchema,
  type LearningMaterial,
  type LessonPreferences,
  type SourceAnalysis,
} from "@/lib/types";

const MISTRAL_MODEL = process.env.TRACE_MISTRAL_MODEL || "mistral-small-latest";

function getMistral() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");
  return new Mistral({ apiKey });
}

function extractContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : ((part as { text?: string }).text ?? "")))
      .join("\n");
  }
  return "";
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1] ?? text;
}

function materialPrompt(analysis: SourceAnalysis, preferences: LessonPreferences) {
  return `
You are Trace, an expert learning designer. Turn the source analysis below into useful, accurate learning material.

Learning goal: ${preferences.goal}
Difficulty: ${preferences.difficulty}
Audience: ${preferences.audience}
Output language: ${preferences.outputLanguage}

Return only valid JSON with this exact shape:
{
  "overview": string,
  "takeaways": [string],
  "studyPlan": [{"title": string, "description": string, "durationMinutes": number?}],
  "flashcards": [{"question": string, "answer": string}],
  "quiz": [{"question": string, "options": [string], "answer": string, "explanation": string}],
  "practicalPrompt": string
}

Create a concise but substantive lesson. Use the requested language for every generated field. Keep quiz answers exact and make distractors plausible. Only use facts grounded in the source.

Source analysis:
${JSON.stringify(analysis)}
`.trim();
}

export async function createLearningMaterial(
  analysis: SourceAnalysis,
  preferences: LessonPreferences,
): Promise<LearningMaterial> {
  const client = getMistral();
  const response = await client.chat.complete({
    model: MISTRAL_MODEL,
    temperature: 0.25,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: materialPrompt(analysis, preferences),
      },
    ],
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  if (!content) throw new Error("Mistral returned empty learning material");
  return learningMaterialSchema.parse(JSON.parse(extractJson(content)));
}

export function createFallbackLearningMaterial(
  analysis: SourceAnalysis,
  preferences: LessonPreferences,
): LearningMaterial {
  const concepts =
    analysis.keyConcepts.length > 0
      ? analysis.keyConcepts
      : [{ term: "Main idea", explanation: analysis.summary }];
  const examples =
    analysis.importantExamples.length > 0 ? analysis.importantExamples : [analysis.summary];
  const takeaways = concepts
    .slice(0, 5)
    .map((concept) => `${concept.term}: ${concept.explanation}`);
  const flashcards = concepts
    .slice(0, 6)
    .map((concept) => ({ question: `What is ${concept.term}?`, answer: concept.explanation }));
  const quiz = concepts.slice(0, 4).map((concept) => ({
    question: `Which statement best matches the lesson's explanation of ${concept.term}?`,
    options: [concept.explanation, "This concept is unrelated to the source."],
    answer: concept.explanation,
    explanation: `This answer comes from the source concept: ${concept.term}.`,
  }));

  return learningMaterialSchema.parse({
    overview: analysis.summary,
    takeaways,
    studyPlan: [
      {
        title: "Read the overview",
        description: `Review the source summary in ${preferences.outputLanguage}.`,
        durationMinutes: 10,
      },
      {
        title: "Work through the concepts",
        description: `Explain each key concept in your own words at a ${preferences.difficulty.toLowerCase()} level.`,
        durationMinutes: 20,
      },
      { title: "Apply one idea", description: examples[0], durationMinutes: 15 },
    ],
    flashcards:
      flashcards.length > 0
        ? flashcards
        : [{ question: "What is this lesson about?", answer: analysis.summary }],
    quiz:
      quiz.length > 0
        ? quiz
        : [
            {
              question: "What is the central idea?",
              options: [analysis.summary, "The source contains no central idea."],
              answer: analysis.summary,
              explanation: "This is the summary extracted from the source.",
            },
          ],
    practicalPrompt: `Write one concrete example of how you could use the lesson's main idea in a ${preferences.audience.toLowerCase()} context.`,
  });
}

export async function answerTutorQuestion(input: {
  question: string;
  analysis: SourceAnalysis;
  material: LearningMaterial;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const client = getMistral();
  const response = await client.chat.complete({
    model: MISTRAL_MODEL,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `You are Trace's patient tutor. Answer only from the supplied lesson context. If the answer is not supported, say that clearly and suggest where the learner can look. Keep the response clear and practical.\n\nLesson context:\n${JSON.stringify({ analysis: input.analysis, material: input.material })}`,
      },
      ...input.history,
      { role: "user", content: input.question },
    ],
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  if (!content) throw new Error("Mistral returned empty tutor response");
  return content.trim();
}

export function answerTutorQuestionFallback(input: {
  question: string;
  analysis: SourceAnalysis;
  material: LearningMaterial;
}) {
  const questionWords = input.question.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  const matchedConcept = input.analysis.keyConcepts.find((concept) => {
    const conceptText = `${concept.term} ${concept.explanation}`.toLowerCase();
    return questionWords.some((word) => conceptText.includes(word));
  });
  const focus = matchedConcept
    ? `${matchedConcept.term}: ${matchedConcept.explanation}`
    : input.analysis.summary;
  const otherConcepts = input.analysis.keyConcepts
    .filter((concept) => concept !== matchedConcept)
    .slice(0, 2)
    .map((concept) => `${concept.term}: ${concept.explanation}`)
    .join("\n");

  return `For your question — “${input.question}” — the most relevant part of this lesson is:\n\n${focus}\n\n${otherConcepts ? `Related ideas:\n${otherConcepts}\n\n` : ""}This answer is grounded in the lesson source. Ask about a specific chapter, example, or concept for a more targeted explanation.`;
}

export async function streamTutorQuestion(input: {
  question: string;
  analysis: SourceAnalysis;
  material: LearningMaterial;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ReadableStream<Uint8Array>> {
  const client = getMistral();
  const encoder = new TextEncoder();

  const stream = await client.chat.stream({
    model: MISTRAL_MODEL,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `You are Trace's patient tutor. Answer only from the supplied lesson context. If the answer is not supported, say that clearly and suggest where the learner can look. Keep the response clear and practical.\n\nLesson context:\n${JSON.stringify({ analysis: input.analysis, material: input.material })}`,
      },
      ...input.history,
      { role: "user", content: input.question },
    ],
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.data?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          controller.enqueue(encoder.encode(delta));
        }
      }
      controller.close();
    },
  });
}
