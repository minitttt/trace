"use client";

import { useRef, useState } from "react";
import { Check, FileText, Link2, Loader2, UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { audienceOptions, difficultyOptions, goalOptions, languageOptions } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { getSourceTypeFromFile, isAllowedSource } from "@/lib/utils";

type SourceMode = "file" | "url";

export function NewLessonForm({ userId }: { userId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState<(typeof goalOptions)[number]>("Study");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("Intermediate");
  const [audience, setAudience] = useState<(typeof audienceOptions)[number]>("Curious Learner");
  const [language, setLanguage] = useState<(typeof languageOptions)[number]>("English");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    if (sourceMode === "file" && !file) return setError("Choose a video or PDF first.");
    if (sourceMode === "url" && !url) return setError("Paste a public video URL first.");
    if (sourceMode === "file" && file && !isAllowedSource(file))
      return setError("Use an MP4, MOV, WebM, or PDF file.");
    setLoading(true);
    let sourcePath: string | null = null;

    try {
      const activeFile = sourceMode === "file" ? file : null;
      const sourceType = activeFile ? getSourceTypeFromFile(activeFile) : "video";
      const supabase = createClient();

      if (activeFile) {
        if (activeFile.size > 500 * 1024 * 1024) throw new Error("Choose a source smaller than 500 MB.");
        sourcePath = `${userId}/${crypto.randomUUID()}-${activeFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const contentType =
          activeFile.type || (sourceType === "pdf" ? "application/pdf" : "video/mp4");
        const { error: uploadError } = await supabase.storage
          .from("sources")
          .upload(sourcePath, activeFile, { contentType, upsert: false });
        if (uploadError) throw uploadError;
      }

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourcePath,
          publicUrl: sourceMode === "url" ? url : null,
          goal,
          difficulty,
          audience,
          outputLanguage: language,
          title: activeFile?.name.replace(/\.[^/.]+$/, "") || "Untitled lesson",
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Could not create lesson",
        );
      window.location.href = `/dashboard/lessons/${payload.lesson.id}`;
    } catch (submitError) {
      if (sourcePath) await createClient().storage.from("sources").remove([sourcePath]);
      setError(submitError instanceof Error ? submitError.message : "Could not create lesson");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b96aa] dark:text-[#8390a7]">
              Step 1
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em]">
              Bring something to learn from.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              Trace works best with one focused source. You can add a video file, PDF, or public
              video URL.
            </p>
          </div>
          <Badge tone="sage">Private by default</Badge>
        </div>

        <div className="mt-8 flex gap-2 rounded-2xl bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => {
              setSourceMode("file");
              setUrl("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              sourceMode === "file"
                ? "bg-surface text-fg shadow-sm dark:bg-[#26345e] dark:text-[#c1ccff]"
                : "text-text-muted hover:text-fg"
            }`}
          >
            <UploadCloud className="h-4 w-4" /> Upload file
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceMode("url");
              setFile(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              sourceMode === "url"
                ? "bg-surface text-fg shadow-sm dark:bg-[#26345e] dark:text-[#c1ccff]"
                : "text-text-muted hover:text-fg"
            }`}
          >
            <Link2 className="h-4 w-4" /> Public URL
          </button>
        </div>

        {sourceMode === "file" ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-5 flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d6def3] bg-[#f8f9ff] px-6 text-center transition hover:border-[#aebcf0] hover:bg-[#f1f4ff] dark:border-[#303b5d] dark:bg-[#171d31] dark:hover:border-[#4a5d9b] dark:hover:bg-[#1c2540]"
          >
            <input
              ref={fileInput}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,application/pdf,.mp4,.mov,.webm,.pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                  {getSourceTypeFromFile(file) === "pdf" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                </div>
                <p className="mt-4 text-sm font-bold">{file.name}</p>
                <p className="mt-1 text-xs text-text-subtle">Click to choose another source</p>
              </>
            ) : (
              <>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-[#5369b2] dark:bg-[#2a3762] dark:text-[#b8c6ff]">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold">Drop a source here, or browse</p>
                <p className="mt-1 text-xs text-text-subtle">
                  MP4, MOV, WebM, or PDF · up to your Supabase limit
                </p>
              </>
            )}
          </button>
        ) : (
          <div className="bg-surface-muted/60 mt-5 rounded-2xl border border-border-token p-5">
            <label className="text-sm font-semibold">
              Public video URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                type="url"
                placeholder="https://…"
                className="mt-2 h-12 w-full rounded-xl border border-border-token bg-surface px-4 text-sm text-fg outline-none focus:border-[#8da4ff] focus:ring-2 focus:ring-[#dfe5ff] dark:focus:ring-[#2b3760]"
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-text-subtle">
               Use a publicly accessible video URL. Private or login-gated videos need
              to be uploaded instead.
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-border-muted pt-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b96aa] dark:text-[#8390a7]">
            Step 2
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.04em]">
            Shape the lesson around you.
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Learning goal"
              value={goal}
              options={goalOptions}
              onChange={setGoal}
            />
            <SelectField
              label="Difficulty"
              value={difficulty}
              options={difficultyOptions}
              onChange={setDifficulty}
            />
            <SelectField
              label="Audience"
              value={audience}
              options={audienceOptions}
              onChange={setAudience}
            />
            <SelectField
              label="Output language"
              value={language}
              options={languageOptions}
              onChange={setLanguage}
            />
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-[#fff0ec] p-3 text-sm text-[#a85541] dark:bg-[#341b17] dark:text-[#f4a18f]">
            {error}
          </p>
        )}

        <Button className="mt-8 w-full sm:w-auto" size="lg" disabled={loading} onClick={submit}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating lesson…
            </>
          ) : (
            <>
              Create lesson <Check className="h-4 w-4" />
            </>
          )}
        </Button>
      </Card>

      <div className="space-y-4">
        <Card className="bg-ink p-6 text-white dark:border dark:border-[#35446f] dark:bg-[#202d52]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c1ccff]">
            What you’ll get
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.05em]">
            A lesson that keeps moving.
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-[#d4e3d6] dark:text-[#b7d1bb]">
            <li className="flex gap-3">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#34446f] text-xs text-[#d3dbff] dark:bg-[#2d3d72] dark:text-[#c1ccff]">
                1
              </span>
              <span>Source summary, chapters, and key concepts.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#34446f] text-xs text-[#d3dbff] dark:bg-[#2d3d72] dark:text-[#c1ccff]">
                2
              </span>
              <span>A practical study plan with flashcards and a quiz.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#34446f] text-xs text-[#d3dbff] dark:bg-[#2d3d72] dark:text-[#c1ccff]">
                3
              </span>
              <span>A tutor grounded in the source, not generic search results.</span>
            </li>
          </ul>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-bold">Processing is asynchronous</p>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            You can close this tab after creating a lesson. Trace will keep processing and save the
            workspace to your library.
          </p>
        </Card>
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 h-12 w-full rounded-xl border border-border-token bg-surface px-3 text-sm text-fg outline-none focus:border-[#8da4ff] focus:ring-2 focus:ring-[#dfe5ff] dark:focus:ring-[#2b3760]"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-surface text-fg">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
