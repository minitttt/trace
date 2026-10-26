import { z } from "zod";

export const sourceTypeSchema = z.enum(["video", "pdf"]);
export const lessonStatusSchema = z.enum(["queued", "processing", "complete", "failed"]);
export const processingStageSchema = z.enum([
  "uploading",
  "reading_source",
  "extracting_content",
  "creating_material",
  "preparing_tutor",
  "complete",
]);

export const lessonPreferencesSchema = z.object({
  goal: z.enum(["Study", "Exam Prep", "Practical Project", "Meeting Notes"]),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  audience: z.enum(["Student", "Professional", "Curious Learner"]),
  outputLanguage: z.string().min(2).max(40),
});

export const sourceAnalysisSchema = z.object({
  title: z.string().min(1),
  sourceType: sourceTypeSchema,
  summary: z.string().min(1),
  transcript: z.array(
    z.object({
      text: z.string().min(1),
      startSeconds: z.number().nonnegative().optional(),
      endSeconds: z.number().nonnegative().optional(),
    }),
  ),
  chapters: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      startSeconds: z.number().nonnegative().optional(),
    }),
  ),
  keyConcepts: z.array(
    z.object({
      term: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  importantExamples: z.array(z.string().min(1)),
});

export const learningMaterialSchema = z
  .object({
  overview: z.string().min(1),
  takeaways: z.array(z.string().min(1)).min(1),
  studyPlan: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      durationMinutes: z.number().int().positive().optional(),
    }),
  ),
  flashcards: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
    }),
  ),
  quiz: z.array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answer: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  practicalPrompt: z.string().min(1),
    podcast: z
      .object({
        title: z.string(),
        tagline: z.string().optional(),
        durationEst: z.string().optional(),
        dialogue: z.array(
          z.object({
            speaker: z.enum(["Leo", "Maya"]),
            text: z.string().min(1),
          }),
        ),
      })
      .optional(),
  })
  .superRefine((material, context) => {
    material.quiz.forEach((question, index) => {
      if (!question.options.includes(question.answer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quiz", index, "answer"],
          message: "Quiz answer must be one of the question options",
        });
      }
    });
  });

export const podcastDialogueSchema = z.object({
  speaker: z.enum(["Leo", "Maya"]),
  text: z.string().min(1),
});

export const podcastSchema = z.object({
  title: z.string(),
  tagline: z.string().optional(),
  durationEst: z.string().optional(),
  dialogue: z.array(podcastDialogueSchema),
});

export type PodcastDialogue = z.infer<typeof podcastDialogueSchema>;
export type PodcastData = z.infer<typeof podcastSchema>;

export const lessonContentSchema = z.object({
  lesson_id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().min(1),
  transcript: sourceAnalysisSchema.shape.transcript,
  chapters: sourceAnalysisSchema.shape.chapters,
  key_concepts: sourceAnalysisSchema.shape.keyConcepts,
  important_examples: z.array(z.string().min(1)),
  learning_material: learningMaterialSchema,
});

export type SourceAnalysis = z.infer<typeof sourceAnalysisSchema>;
export type LearningMaterial = z.infer<typeof learningMaterialSchema>;
export type LessonPreferences = z.infer<typeof lessonPreferencesSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type LessonStatus = z.infer<typeof lessonStatusSchema>;
export type ProcessingStage = z.infer<typeof processingStageSchema>;

export type Lesson = {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  source_path: string | null;
  public_url: string | null;
  goal: LessonPreferences["goal"];
  difficulty: LessonPreferences["difficulty"];
  audience: LessonPreferences["audience"];
  output_language: string;
  status: LessonStatus;
  processing_stage: ProcessingStage;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonContent = z.infer<typeof lessonContentSchema>;

export type ChatMessage = {
  id: string;
  lesson_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
