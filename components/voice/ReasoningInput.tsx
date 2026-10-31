"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CornerDownLeft, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};
/** Web Speech API support (false on the server, so the mic button never causes a hydration mismatch). */
const useSpeechSupported = () => useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);

const PLACEHOLDER = "Tap your answer, then say why in a sentence or two, e.g. “I used V = IR, so 12 by 3…”";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
  /** Lighter variant for the diagnostic. */
  compact?: boolean;
  submitLabel?: string;
}

/** The Wispr Flow target: a large focused textarea for messy spoken reasoning, plus a browser-mic backup. */
export function ReasoningInput({ value, onChange, onSubmit, canSubmit, disabled = false, compact = false, submitLabel = "Submit" }: Props) {
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const supported = useSpeechSupported();
  const recognition = useRef<Recognition | null>(null);
  const base = useRef("");
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  useEffect(() => () => recognition.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = true;
    base.current = value ? `${value.trimEnd()} ` : "";
    r.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      onChange(base.current + finalText + interim);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="label-caps flex items-center gap-1.5">
          <Mic className="size-3.5 text-accent" aria-hidden /> Think out loud
        </h3>
        <span className={cn("flex items-center gap-1.5 text-xs transition-opacity", focused || listening ? "opacity-100" : "opacity-0")} aria-hidden>
          <span className="flex h-3 items-center gap-[2px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="wave-bar h-3 w-[2px] rounded-full bg-accent" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </span>
          <span className="text-accent">{listening ? "Listening (browser mic)…" : "Listening for Wispr Flow…"}</span>
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">{words} words</span>
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Press your Wispr Flow hotkey and explain <em>why</em>. Ramble if you like; we&apos;ll clean it up.
        </p>
      )}
      <div className={cn("rounded-lg", (focused || listening) && "listening-border")}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSubmit && !disabled) onSubmit();
            }
          }}
          disabled={disabled}
          rows={compact ? 2 : 4}
          placeholder={PLACEHOLDER}
          aria-label="Your reasoning (dictate with Wispr Flow or type)"
          className="block w-full resize-y rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
        />
      </div>
      <div className="flex items-center gap-2">
        {supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            aria-pressed={listening}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40",
              listening && "border-weak/50 text-weak",
            )}
          >
            {listening ? <MicOff className="size-3.5" aria-hidden /> : <Mic className="size-3.5" aria-hidden />}
            {listening ? "Stop mic" : "Browser mic"}
          </button>
        )}
        <span className="hidden text-xs text-muted-foreground sm:inline">⏎ submit · ⇧⏎ new line</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || disabled}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none active:translate-y-px disabled:opacity-40"
        >
          {submitLabel} <CornerDownLeft className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
