"use client";

import { useEffect, useRef, useState } from "react";
import {
  FastForward,
  Headphones,
  Loader2,
  Mic,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLanguageLocale } from "@/lib/constants";
import type { PodcastData, PodcastDialogue } from "@/lib/types";

interface AudioOverviewProps {
  lessonId: string;
  initialPodcast?: PodcastData;
  lessonTitle: string;
  outputLanguage: string;
}

function pickBrowserVoice(
  voices: SpeechSynthesisVoice[],
  speaker: PodcastDialogue["speaker"],
  language: string,
) {
  const locale = getLanguageLocale(language).toLowerCase();
  const languageCode = locale.split("-")[0];
  const localizedVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(languageCode));
  const candidates = localizedVoices.length > 0 ? localizedVoices : voices;
  if (speaker === "Maya") {
    return (
      candidates.find((voice) =>
        /samantha|victoria|karen|moira|zira|ava|allison|susan|google.*female|female/i.test(
          voice.name,
        ),
      ) ?? candidates.find((voice) => !/david|alex|daniel|george|mark|male/i.test(voice.name)) ?? candidates[0]
    );
  }

  return (
    candidates.find((voice) => /david|alex|daniel|george|mark|google.*male|male/i.test(voice.name)) ??
    candidates[0]
  );
}

function getSpeechContext(dialogue: PodcastDialogue[], index: number) {
  return {
    previousText: index > 0 ? dialogue[index - 1].text.slice(-100) : undefined,
    nextText: index + 1 < dialogue.length ? dialogue[index + 1].text.slice(0, 100) : undefined,
  };
}

export function AudioOverview({ lessonId, initialPodcast, lessonTitle, outputLanguage }: AudioOverviewProps) {
  const [podcast, setPodcast] = useState<PodcastData | null>(initialPodcast ?? null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [useEnhancedAudio, setUseEnhancedAudio] = useState(false);
  const [enhancedAudioAvailable, setEnhancedAudioAvailable] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobCacheRef = useRef<Map<number, string>>(new Map());
  const turnsRef = useRef<PodcastDialogue[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (podcast?.dialogue) {
      turnsRef.current = podcast.dialogue;
    }
  }, [podcast]);

  // Check whether enhanced audio is available on the backend.
  useEffect(() => {
    async function checkTTSConfig() {
      try {
        const res = await fetch("/api/tts");
        if (res.ok) {
          const data = await res.json();
          if (data.configured) {
            setEnhancedAudioAvailable(true);
            setUseEnhancedAudio(true);
          }
        }
      } catch {
        // Fallback to browser
      }
    }
    checkTTSConfig();

    if (typeof window !== "undefined" && !("speechSynthesis" in window)) {
      setSpeechSupported(false);
    }

    const speechSynthesis = typeof window !== "undefined" ? window.speechSynthesis : null;
    const updateVoices = () => {
      if (speechSynthesis) voicesRef.current = speechSynthesis.getVoices();
    };
    updateVoices();
    speechSynthesis?.addEventListener("voiceschanged", updateVoices);

    // Cleanup audio on unmount
    return () => {
      speechSynthesis?.removeEventListener("voiceschanged", updateVoices);
      stopPlayback();
      clearAudioCache();
    };
  }, []);

  // Generate / Regenerate podcast
  async function handleGenerate(regenerate = false) {
    setLoading(true);
    stopPlayback();
    clearAudioCache();

    try {
      const res = await fetch(`/api/lessons/${lessonId}/podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });

      if (!res.ok) throw new Error("Failed to generate audio overview");
      const data = await res.json();
      if (data.podcast) {
        setPodcast(data.podcast);
        setCurrentTurn(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Pre-fetch the next turn audio in the background.
  async function prefetchTurn(index: number) {
    if (!useEnhancedAudio || !podcast?.dialogue?.[index]) return;
    if (audioBlobCacheRef.current.has(index)) return;

    try {
      const turn = podcast.dialogue[index];
      const speechContext = getSpeechContext(podcast.dialogue, index);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: turn.text,
          speaker: turn.speaker,
          language: outputLanguage,
          ...speechContext,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioBlobCacheRef.current.set(index, url);
      }
    } catch {
      // Pre-fetch failure is non-fatal
    }
  }

  // Play a specific dialogue turn index
  async function playTurn(index: number) {
    if (!podcast?.dialogue || index < 0 || index >= podcast.dialogue.length) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setCurrentTurn(index);
    setIsPlaying(true);

    const turn = podcast.dialogue[index];

    // Scroll active dialogue into view
    const el = document.getElementById(`dialogue-turn-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // 1. Try enhanced audio if enabled.
    if (useEnhancedAudio) {
      try {
        let audioUrl = audioBlobCacheRef.current.get(index);

        if (!audioUrl) {
          setIsBuffering(true);
          const speechContext = getSpeechContext(podcast.dialogue, index);
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: turn.text,
              speaker: turn.speaker,
              language: outputLanguage,
              ...speechContext,
            }),
          });

          setIsBuffering(false);

          if (!res.ok) {
            console.warn("Enhanced audio returned an error; falling back to browser voice");
            playTurnBrowser(index);
            return;
          }

          const blob = await res.blob();
          audioUrl = URL.createObjectURL(blob);
          audioBlobCacheRef.current.set(index, audioUrl);
        }

        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;
        audio.playbackRate = playbackRate;
        audio.muted = muted;

        audio.onended = () => {
          if (index + 1 < (podcast?.dialogue.length ?? 0)) {
            playTurn(index + 1);
          } else {
            setIsPlaying(false);
            setCurrentTurn(0);
          }
        };

        audio.onerror = () => {
          console.warn("Audio playback error, falling back to browser synthesis");
          playTurnBrowser(index);
        };

        await audio.play();

        // Pre-fetch the next turn while current one is speaking
        if (index + 1 < podcast.dialogue.length) {
          prefetchTurn(index + 1);
        }

        return;
      } catch (err) {
          console.warn("Enhanced audio playback failed, falling back to browser speech:", err);
        setIsBuffering(false);
      }
    }

    // 2. Browser Web Speech API fallback
    playTurnBrowser(index);
  }

  function playTurnBrowser(index: number) {
    if (!speechSupported || typeof window === "undefined") return;
    if (!podcast?.dialogue || index < 0 || index >= podcast.dialogue.length) return;

    window.speechSynthesis.cancel();
    const turn = podcast.dialogue[index];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = getLanguageLocale(outputLanguage);
    utteranceRef.current = utterance;

    // Prefer a distinct voice for each co-host, especially for Maya.
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    const isLeo = turn.speaker === "Leo";
  const selectedVoice = pickBrowserVoice(voices, turn.speaker, outputLanguage);
    if (selectedVoice) utterance.voice = selectedVoice;

    // Avoid pitch-shifting Maya too far; it makes the browser fallback sound synthetic.
    utterance.pitch = isLeo ? 0.98 : 1.02;
    utterance.rate = playbackRate * (isLeo ? 0.98 : 0.96);
    if (muted) utterance.volume = 0;

    utterance.onend = () => {
      if (index + 1 < (podcast?.dialogue.length ?? 0)) {
        playTurn(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentTurn(0);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("Speech synthesis error:", e);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function togglePlayPause() {
    if (isPlaying) {
      stopPlayback();
    } else {
      playTurn(currentTurn);
    }
  }

  function stopPlayback() {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsBuffering(false);
  }

  function clearAudioCache() {
    for (const url of Array.from(audioBlobCacheRef.current.values())) URL.revokeObjectURL(url);
    audioBlobCacheRef.current.clear();
  }

  function handleNextTurn() {
    if (!podcast) return;
    const next = Math.min((podcast.dialogue.length || 1) - 1, currentTurn + 1);
    playTurn(next);
  }

  function handlePrevTurn() {
    const prev = Math.max(0, currentTurn - 1);
    playTurn(prev);
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 0.85];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackRate(newSpeed);

    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = newSpeed;
    }
    if (isPlaying) {
      playTurn(currentTurn);
    }
  }

  // If no podcast exists yet
  if (!podcast && !loading) {
    return (
      <Card className="relative overflow-hidden p-8 sm:p-10">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-mint/50 opacity-40 blur-3xl dark:bg-[#26345e]/40" />

        <div className="relative max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe5ff] bg-[#eef1ff] px-3 py-1 text-xs font-bold text-[#5369b2] dark:border-[#35446f] dark:bg-[#202d52] dark:text-[#b8c6ff]">
              <Radio className="h-3.5 w-3.5 animate-pulse text-[#529362]" />
              Audio Deep Dive
            </div>

            {enhancedAudioAvailable && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                <Sparkles className="h-3 w-3" /> Enhanced audio
              </span>
            )}
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em]">
            Listen to an Audio Overview
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Transform this lesson into a lively, 2-host conversational podcast episode. Co-hosts{" "}
            <strong>Leo</strong> and <strong>Maya</strong> bounce ideas off each other, unpack
            difficult concepts with relatable analogies, and summarize the takeaways.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              onClick={() => handleGenerate(false)}
              className="gap-2.5 shadow-md transition hover:scale-[1.02]"
            >
              <Headphones className="h-4 w-4" />
              Generate Audio Overview
            </Button>
            <span className="text-xs text-text-subtle">
              {enhancedAudioAvailable ? "Enhanced audio available" : "Standard voice available"}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center sm:p-16">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-mint text-[#5369b2] shadow-soft dark:bg-[#2a3762] dark:text-[#b8c6ff]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h3 className="mt-6 text-xl font-bold tracking-[-0.03em]">
          Synthesizing your podcast episode…
        </h3>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Leo and Maya are reviewing your lesson summary, outlining the narrative arc, and scripting
          the dialogue.
        </p>
      </Card>
    );
  }

  const dialogue = podcast?.dialogue ?? [];
  const currentItem = dialogue[currentTurn];
  const progressPercent = dialogue.length > 0 ? ((currentTurn + 1) / dialogue.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Player Card */}
      <Card className="relative overflow-hidden border-[#e0e5f3] bg-gradient-to-br from-[#f8f9ff] to-white p-6 shadow-soft dark:border-[#303b5d] dark:from-[#151b29] dark:to-[#0d1017] sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Episode Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-bold text-[#5369b2] dark:bg-[#26345e] dark:text-[#b8c6ff]">
                <Radio className={`h-3 w-3 ${isPlaying ? "animate-pulse text-emerald-500" : ""}`} />
                Deep Dive Episode
              </span>

              {enhancedAudioAvailable ? (
                <button
                  type="button"
                  onClick={() => setUseEnhancedAudio((v) => !v)}
                    title="Toggle enhanced audio vs standard voice"
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                    useEnhancedAudio
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                      : "bg-surface-muted text-text-muted"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                    {useEnhancedAudio ? "Enhanced audio" : "Standard voice"}
                </button>
              ) : (
                <span className="text-[11px] text-text-subtle">
                  Standard Voice (Add ELEVENLABS_API_KEY for HD)
                </span>
              )}

              <span className="text-xs text-text-subtle">
                {podcast?.durationEst ?? "3 min"} · 2 co-hosts
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              {podcast?.title ?? lessonTitle}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {podcast?.tagline ?? "An intelligent conversational breakdown with Leo & Maya"}
            </p>
          </div>

          {/* Regenerate action */}
          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={loading}
            title="Generate a fresh script"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-border-token bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:text-fg md:self-auto"
          >
            <RefreshCw className="h-3 w-3" /> Regenerate
          </button>
        </div>

        {/* Progress scrub bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-text-subtle">
            <span>
              Turn {currentTurn + 1} of {dialogue.length}
            </span>
            <span className="font-bold text-[#6f83c7] dark:text-[#9db0ff]">
              {currentItem?.speaker === "Leo"
                ? "Leo (Curious co-host)"
                : "Maya (Lead explainer)"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-[#8da4ff] transition-all duration-300 dark:bg-[#7088f1]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Control Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border-muted pt-5">
          {/* Waveform graphic */}
          <div className="flex items-center gap-1">
            {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50].map((height, i) => (
              <span
                key={i}
               className="w-1 rounded-full bg-[#9cadff] transition-all duration-200 dark:bg-[#7088f1]"
                style={{
                  height: isPlaying
                    ? `${Math.max(12, height * (i % 2 === 0 ? 1 : 0.7)) / 3.5}px`
                    : "6px",
                  opacity: isPlaying ? 0.9 : 0.35,
                }}
              />
            ))}
          </div>

          {/* Transport buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevTurn}
              disabled={currentTurn === 0}
              aria-label="Previous speaker"
              className="rounded-full p-2 text-text-muted transition hover:bg-surface-muted hover:text-fg disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isBuffering}
              aria-label={isPlaying ? "Pause audio overview" : "Play audio overview"}
               className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-soft transition hover:scale-105 active:scale-95 disabled:opacity-75 dark:bg-[#2d3d72] dark:text-white"
            >
              {isBuffering ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNextTurn}
              disabled={currentTurn >= dialogue.length - 1}
              aria-label="Next speaker"
              className="rounded-full p-2 text-text-muted transition hover:bg-surface-muted hover:text-fg disabled:opacity-40"
            >
              <FastForward className="h-4 w-4" />
            </button>
          </div>

          {/* Secondary settings: Speed & Mute */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              title="Change speech rate"
              className="rounded-full border border-border-token bg-surface px-3 py-1 text-xs font-bold text-text-muted transition hover:text-fg"
            >
              {playbackRate}x speed
            </button>

            <button
              type="button"
              onClick={() => {
                setMuted((m) => !m);
                if (audioElementRef.current) {
                  audioElementRef.current.muted = !muted;
                }
                if (isPlaying && !useEnhancedAudio) playTurn(currentTurn);
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className="rounded-full p-2 text-text-muted hover:bg-surface-muted"
            >
              {muted ? <VolumeX className="h-4 w-4 text-coral" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </Card>

      {/* Transcript with Interactive Karaoke-Style Jump */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-[-0.03em]">Episode Transcript</h3>
            <span className="text-xs text-text-subtle">Click any line to play from there</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#6076c1] dark:text-[#9db0ff]">
                   <span className="h-2 w-2 rounded-full bg-[#9cadff]" /> Leo
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#486b7e] dark:text-[#88bad2]">
                   <span className="h-2 w-2 rounded-full bg-[#8aa5ff]" /> Maya
            </span>
          </div>
        </div>

        <div className="space-y-3.5">
          {dialogue.map((item, idx) => {
            const isSelected = idx === currentTurn;
            const isLeo = item.speaker === "Leo";

            return (
              <div
                key={idx}
                id={`dialogue-turn-${idx}`}
                onClick={() => playTurn(idx)}
                className={`group relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all ${
                  isSelected
                         ? "border-[#8da4ff] bg-white shadow-md ring-2 ring-[#aebcf0]/40 dark:border-[#4a5d9b] dark:bg-[#18213a] dark:ring-[#35446f]"
                         : "border-border-token bg-surface hover:border-[#b8c5ea] hover:bg-surface-muted dark:hover:border-[#46557a]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Speaker Avatar */}
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black shadow-sm ${
                      isLeo
                        ? "bg-[#e6ebff] text-[#5369b2] dark:bg-[#26345e] dark:text-[#b8c6ff]"
                        : "bg-[#e5eff5] text-[#3b5e71] dark:bg-[#1a303d] dark:text-[#8cc2db]"
                    }`}
                  >
                    {isLeo ? <Headphones className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </div>

                  {/* Dialogue Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold tracking-tight">
                        {item.speaker}
                        <span className="ml-2 font-normal text-text-subtle">
                          {isLeo ? "Co-host" : "Lead explainer"}
                        </span>
                      </p>

                      {isSelected && isPlaying && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#6278c7] dark:text-[#aebcff]">
                          <Volume2 className="h-3.5 w-3.5 animate-pulse" /> Speaking
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-1.5 text-sm leading-6 transition ${
                        isSelected
                          ? "font-medium text-fg"
                          : "text-text-muted group-hover:text-fg"
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
