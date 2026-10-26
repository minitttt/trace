import { Mistral } from "@mistralai/mistralai";
import { GoogleGenAI } from "@google/genai";
import { podcastSchema, type PodcastData, type SourceAnalysis } from "@/lib/types";

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1] ?? text;
}

export async function generatePodcast(content: {
  title: string;
  summary: string;
  key_concepts: SourceAnalysis["keyConcepts"];
  chapters: SourceAnalysis["chapters"];
  takeaways?: string[];
  outputLanguage?: string;
}): Promise<PodcastData> {
  const language = content.outputLanguage || "English";

  const prompt = `
You are the creator of "Trace Deep Dive", an engaging 2-host audio overview.
Generate an entertaining, conversational, and highly informative audio dialogue between two AI co-hosts dissecting this topic.

Co-hosts:
- "Leo": The curious, enthusiastic co-host. He asks thought-provoking questions, brings everyday analogies, and connects the concepts.
- "Maya": The sharp, articulate lead explainer. She breaks down the nuances, gives clear conceptual breakdowns, and ties ideas back to first principles.

Script Requirements:
1. Start with an energetic intro welcoming listeners to this episode on "${content.title}".
2. Natural spoken flow: Include verbal affirmations ("Exactly", "That's a huge point", "Wait, why does that matter?").
3. Thoroughly cover the core ideas from the summary and key concepts below.
4. Exactly 8 to 12 alternating dialogue lines (balanced between Leo and Maya).
5. Produce the entire dialogue in ${language}.
6. Write every line as natural spoken prose: use contractions, varied sentence lengths, and short pauses.
7. Do not use markdown, bullet points, headings, citations, stage directions, or dense semicolon-heavy lists.

Topic Title: ${content.title}
Summary: ${content.summary}
Key Concepts: ${JSON.stringify(content.key_concepts)}
Chapters: ${JSON.stringify(content.chapters)}
Takeaways: ${JSON.stringify(content.takeaways ?? [])}

Return ONLY a JSON object with this exact structure:
{
  "title": "${content.title.replace(/"/g, "'")} — Deep Dive",
  "tagline": "An audio exploration with Leo & Maya",
  "durationEst": "3 min",
  "dialogue": [
    {
      "speaker": "Leo",
      "text": "Welcome to Trace Deep Dive! Today we're breaking down..."
    },
    {
      "speaker": "Maya",
      "text": "Hey Leo! This is honestly one of the most fascinating topics because..."
    }
  ]
}
`.trim();

  // 1. Try Mistral
  if (process.env.MISTRAL_API_KEY) {
    try {
      const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
      const res = await mistral.chat.complete({
        model: process.env.TRACE_MISTRAL_MODEL || "mistral-small-latest",
        temperature: 0.7,
        responseFormat: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert audio producer. Return only valid JSON matching the schema.",
          },
          { role: "user", content: prompt },
        ],
      });

      const choice = res.choices?.[0]?.message?.content;
      const text = typeof choice === "string" ? choice : JSON.stringify(choice);
      const parsed = JSON.parse(extractJson(text));
      return podcastSchema.parse(parsed);
    } catch (err) {
      console.warn("Mistral podcast generation failed, trying fallback:", err);
    }
  }

  // 2. Try Gemini
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: process.env.TRACE_PODCAST_GEMINI_MODEL || "gemini-3.8-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const parsed = JSON.parse(extractJson(text));
      return podcastSchema.parse(parsed);
    } catch (err) {
      console.warn("Gemini podcast generation failed, using structured fallback:", err);
    }
  }

  // 3. Resilient Grounded Fallback (Never leaves user stranded)
  return createFallbackPodcast(content);
}

function createFallbackPodcast(content: {
  title: string;
  summary: string;
  key_concepts: SourceAnalysis["keyConcepts"];
  chapters: SourceAnalysis["chapters"];
  takeaways?: string[];
}): PodcastData {
  const c1 = content.key_concepts[0]?.term ?? "the core concept";
  const e1 = content.key_concepts[0]?.explanation ?? "how this framework operates";
  const c2 = content.key_concepts[1]?.term ?? "the secondary element";
  const e2 = content.key_concepts[1]?.explanation ?? "connecting the foundational components";
  const firstChapter = content.chapters[0]?.title ?? "the opening foundations";

  return {
    title: `${content.title} — Deep Dive`,
    tagline: "An audio breakdown with Leo & Maya",
    durationEst: "2-3 min",
    dialogue: [
      {
        speaker: "Leo",
        text: `Welcome back to Trace Deep Dive! Today we're breaking down "${content.title}", and I've gotta say, there are some pretty remarkable takeaways in this one.`,
      },
      {
        speaker: "Maya",
        text: `Hey Leo! Yes, the big throughline here really centers around ${content.summary.slice(0, 150)}... and what makes this so critical is how it shifts our approach.`,
      },
      {
        speaker: "Leo",
        text: `Right from the start in ${firstChapter}, we're introduced to ${c1}. For someone hearing about this for the first time, how should they visualize it?`,
      },
      {
        speaker: "Maya",
        text: `Think of ${c1} as the anchor. Essentially: ${e1}. Once you get that locked down, the entire mechanism starts making total sense.`,
      },
      {
        speaker: "Leo",
        text: `That clicks! But then what about ${c2}? Because that seems to be where things get really practical.`,
      },
      {
        speaker: "Maya",
        text: `Exactly. ${c2} is where the theory turns into execution: ${e2}. If you miss that step, the whole system becomes much harder to navigate.`,
      },
      {
        speaker: "Leo",
        text: `So if you're taking away one golden rule from this entire lesson, what's the headline?`,
      },
      {
        speaker: "Maya",
        text: `The headline is simple: master the foundations first, make the hidden assumptions visible, and apply it immediately in your own workflow. That's how this knowledge actually sticks.`,
      },
    ],
  };
}
