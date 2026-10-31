"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, GraduationCap, Landmark, Loader2, Sparkles } from "lucide-react";
import { customTest } from "@/lib/ai/api";
import { isBuiltInSubject } from "@/lib/tracks/build";
import { DIFFICULTY_MODES, type CustomTestRequest, type CustomTrack, type DifficultyMode } from "@/lib/tracks/types";
import { cn } from "@/lib/utils";
import { GeneratingSteps } from "./GeneratingSteps";

const SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics", "History", "Geography", "Economics", "Computer Science", "English"];
const STANDARDS = ["6", "7", "8", "9", "10", "11", "12", "College"];
const BOARDS = ["CBSE", "ICSE", "State board", "IB", "IGCSE", "Other"];
const COUNTS = [8, 12, 16, 20];

/** Example chapters per subject, as tap-to-add chips under the syllabus box. */
const EXAMPLES: Record<string, string[]> = {
  Physics: ["Electricity", "Light: reflection & refraction", "Motion & laws of motion", "Magnetic effects of current"],
  Chemistry: ["Chemical reactions & equations", "Acids, bases and salts", "Carbon and its compounds", "Periodic classification"],
  Biology: ["Life processes", "Control and coordination", "Heredity", "Cell structure"],
  Mathematics: ["Quadratic equations", "Trigonometry", "Arithmetic progressions", "Coordinate geometry"],
  History: ["Nationalism in India", "The French Revolution", "The rise of nationalism in Europe"],
  Geography: ["Resources and development", "Water resources", "Agriculture", "Climate"],
  Economics: ["Development", "Money and credit", "Sectors of the Indian economy"],
  "Computer Science": ["Python basics", "Data structures: lists & dictionaries", "Boolean logic", "Networking basics"],
  English: ["Tenses", "Reported speech", "Active and passive voice", "Reading comprehension"],
};

const chip = (active: boolean) =>
  cn(
    "h-8 rounded-lg border px-3 text-xs transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
    active ? "border-accent/60 bg-accent/10 text-foreground" : "border-border bg-surface-2 text-muted-foreground",
  );
const field =
  "h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-accent/30 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30";

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
      <span className="flex size-7 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-xs text-accent tabular">{n}</span>
      <div className="flex min-w-0 flex-col gap-2">
        <legend className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden /> {title}
        </legend>
        {children}
      </div>
    </fieldset>
  );
}

interface Props {
  onCreated: (track: CustomTrack) => void;
  onBuiltIn: () => void;
}

export function CreateTestForm({ onCreated, onBuiltIn }: Props) {
  const [subject, setSubject] = useState("Physics");
  const [standard, setStandard] = useState("10");
  const [board, setBoard] = useState("CBSE");
  const [syllabus, setSyllabus] = useState("");
  const [count, setCount] = useState(12);
  const [difficulty, setDifficulty] = useState<DifficultyMode>("mixed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const req: CustomTestRequest = { subject: subject.trim(), standard: standard.trim(), board: board.trim(), syllabus: syllabus.trim(), count, difficulty };
  const ready = req.subject.length >= 2 && req.standard.length >= 1 && req.syllabus.length >= 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const env = await customTest(req);
    setBusy(false);
    if (env.data) return onCreated(env.data);
    setError(env.reason ?? "unavailable");
  };

  const addExample = (ex: string) => setSyllabus((s) => (s.trim() ? `${s.trim().replace(/[,;]$/, "")}, ${ex}` : ex));

  if (busy) return <GeneratingSteps subject={req.subject} standard={req.standard} count={count} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Step n={1} icon={BookOpen} title="Which subject?">
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" aria-pressed={subject === s} onClick={() => setSubject(s)} className={chip(subject === s)}>
              {s}
            </button>
          ))}
        </div>
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="Or type any subject" aria-label="Subject" />
      </Step>

      <Step n={2} icon={GraduationCap} title="Your class / standard">
        <div className="flex flex-wrap gap-1.5">
          {STANDARDS.map((s) => (
            <button key={s} type="button" aria-pressed={standard === s} onClick={() => setStandard(s)} className={cn(chip(standard === s), "min-w-10 font-mono tabular")}>
              {s}
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} icon={Landmark} title="Board / curriculum">
        <div className="flex flex-wrap gap-1.5">
          {BOARDS.map((b) => (
            <button key={b} type="button" aria-pressed={board === b} onClick={() => setBoard(b)} className={chip(board === b)}>
              {b}
            </button>
          ))}
        </div>
      </Step>

      <Step n={4} icon={Sparkles} title="What do you want to study?">
        <textarea
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Chapters, topics, or paste your syllabus. Speak it with Wispr Flow if you like: “umm the electricity chapter, mainly series and parallel and power”"
          className="w-full resize-y rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 hover:border-accent/30 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label="Syllabus or topics"
        />
        {EXAMPLES[subject] && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Add:</span>
            {EXAMPLES[subject].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => addExample(ex)}
                className="rounded-full border border-dashed border-border px-2 py-0.5 transition-colors hover:border-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                + {ex}
              </button>
            ))}
          </div>
        )}
      </Step>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="label-caps">Questions</span>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1">
            {COUNTS.map((n) => (
              <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={cn("h-7 rounded-md font-mono text-xs tabular transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none", count === n ? "bg-surface text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label-caps">Difficulty</span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {DIFFICULTY_MODES.map((d) => (
              <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)} className={cn("h-7 rounded-md text-xs capitalize transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none", difficulty === d ? "bg-surface text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-developing/30 bg-developing/10 p-3 text-xs text-developing">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" aria-hidden /> The AI couldn&rsquo;t write this test right now
          </p>
          <p className="text-developing/80">
            Reason: <span className="font-mono">{error}</span>. Try again in a moment
            {isBuiltInSubject(req) ? "." : ", or take the built-in Class 10 Physics test, which works offline."}
          </p>
          {!isBuiltInSubject(req) && (
            <button type="button" onClick={onBuiltIn} className="self-start rounded-md border border-developing/40 px-2 py-1 hover:bg-developing/15 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              Take the Class 10 Physics test
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!ready}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        Create my {count}-question test
      </button>
      {!ready && <p className="-mt-3 text-center text-[11px] text-muted-foreground">Tell us what you want to study (step 4) to continue.</p>}
    </form>
  );
}
