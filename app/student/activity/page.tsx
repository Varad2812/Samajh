"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, ClipboardCheck, FastForward, FileCheck2, LogIn, LogOut, PlayCircle, RotateCcw, Sparkles, UserPlus, WandSparkles, XCircle, type LucideIcon } from "lucide-react";
import { fetchLogs, useAccount, type LogRow } from "@/lib/account";
import { conceptName } from "@/lib/ai/studyPlan";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { cn, fmt2, masteryColor, pct } from "@/lib/utils";

const KINDS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  attempt: { label: "Attempts", icon: CheckCircle2, tone: "text-proficient" },
  custom_test_created: { label: "Tests built", icon: WandSparkles, tone: "text-accent" },
  custom_test_done: { label: "Tests taken", icon: FileCheck2, tone: "text-mastered" },
  study_plan: { label: "Video plans", icon: Sparkles, tone: "text-accent" },
  video_done: { label: "Videos watched", icon: PlayCircle, tone: "text-accent-2" },
  diagnostic: { label: "Diagnostics", icon: ClipboardCheck, tone: "text-mastered" },
  login: { label: "Sign-ins", icon: LogIn, tone: "text-muted-foreground" },
  logout: { label: "Sign-outs", icon: LogOut, tone: "text-muted-foreground" },
  signup: { label: "Account created", icon: UserPlus, tone: "text-accent" },
  fast_forward: { label: "Fast-forwards", icon: FastForward, tone: "text-developing" },
  reset: { label: "Resets", icon: RotateCcw, tone: "text-weak" },
  bulk_load: { label: "Demo loads", icon: Sparkles, tone: "text-developing" },
};
const meta = (kind: string) => KINDS[kind] ?? { label: kind, icon: CircleAlert, tone: "text-muted-foreground" };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : null);

function describe(row: LogRow): { title: string; detail: string } {
  const p = row.payload;
  switch (row.kind) {
    case "attempt": {
      const mc = MISCONCEPTION_BY_ID[str(p.misconceptionId)];
      const verdict = p.verdict === "correct_sound" ? "Correct, sound reasoning" : p.verdict === "correct_flawed" ? "Correct, flawed reasoning" : "Incorrect";
      return { title: `${conceptName(str(p.conceptId))} · ${str(p.mode) || "practice"}`, detail: `${verdict}${mc ? ` · ${mc.label}` : ""}` };
    }
    case "study_plan":
      return { title: `45-min plan · ${num(p.videos) ?? 0} videos`, detail: `${Array.isArray(p.topics) ? p.topics.join(", ") : ""} · ${p.source === "ai" ? `Gemini, ${num(p.verified) ?? 0} verified links` : "offline plan"}` };
    case "custom_test_created":
      return { title: `Built: ${str(p.title) || "custom test"}`, detail: `${str(p.subject)} · Class ${str(p.standard)} · ${num(p.questions) ?? 0} questions · ${p.source === "ai" ? "written by AI" : "built-in bank"}` };
    case "custom_test_done": {
      const total = num(p.total) ?? 0;
      const correct = num(p.correct) ?? 0;
      return { title: `Took: ${str(p.title) || "custom test"} · ${total ? Math.round((correct / total) * 100) : 0}%`, detail: `${correct}/${total} correct · ${str(p.subject)} · Class ${str(p.standard)}` };
    }
    case "video_done":
      return { title: str(p.title), detail: `${conceptName(str(p.conceptId))} · ${num(p.minutes) ?? 0} min` };
    case "fast_forward":
      return { title: `Clock moved ${num(p.days) ?? 0} days ahead`, detail: "Spaced reviews re-evaluated" };
    case "bulk_load":
      return { title: "Demo profile loaded", detail: `${num(p.attempts) ?? 0} synthetic attempts` };
    case "reset":
      return { title: "Progress reset", detail: `${num(p.cleared) ?? 0} attempts cleared` };
    case "diagnostic":
      return { title: "Diagnostic finished", detail: `Ability θ ${num(p.theta) ?? "—"}` };
    default:
      return { title: meta(row.kind).label, detail: "" };
  }
}

const dayLabel = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function ActivityPage() {
  const user = useAccount((s) => s.user);
  const [data, setData] = useState<{ logs: LogRow[]; counts: Record<string, number> } | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchLogs(400)
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(() => (data?.logs ?? []).filter((r) => !filter || r.kind === filter), [data, filter]);
  const days = useMemo(() => {
    const out: [string, LogRow[]][] = [];
    for (const r of rows) {
      const d = dayLabel(r.at);
      if (out.at(-1)?.[0] !== d) out.push([d, []]);
      out.at(-1)![1].push(r);
    }
    return out;
  }, [rows]);

  const attempts = (data?.logs ?? []).filter((r) => r.kind === "attempt");
  const correct = attempts.filter((r) => r.payload.correct === true).length;
  const avgConf = attempts.length ? attempts.reduce((s, r) => s + (num(r.payload.confidence) ?? 0), 0) / attempts.length : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="panel flex flex-wrap items-end gap-4 p-4">
        <div className="mr-auto">
          <p className="label-caps">Activity log</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{user?.name ?? "Your"}&rsquo;s learning timeline</h1>
          <p className="text-xs text-muted-foreground">Everything you do is saved to your account: attempts, reasoning, plans and sessions.</p>
        </div>
        {[
          ["Events", String(Object.values(data?.counts ?? {}).reduce((a, b) => a + b, 0))],
          ["Attempts (recent)", String(attempts.length)],
          ["Accuracy", attempts.length ? pct(correct / attempts.length) : "—"],
          ["Avg confidence", attempts.length ? fmt2(avgConf) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-28 rounded-lg bg-surface-2 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className="font-mono text-lg tabular">{data ? value : "…"}</div>
          </div>
        ))}
      </header>

      <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Filter events">
        <Chip active={filter === null} onClick={() => setFilter(null)} label="All" count={null} />
        {Object.entries(data?.counts ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([kind, n]) => (
            <Chip key={kind} active={filter === kind} onClick={() => setFilter(kind)} label={meta(kind).label} count={n} />
          ))}
      </div>

      <section className="panel p-4" aria-label="Events">
        {error && <p className="text-sm text-weak">Couldn&rsquo;t load your log. Check your connection and refresh.</p>}
        {!data && !error && <div className="flex flex-col gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-2" />)}</div>}
        {data && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet. Answer a practice question or build a video plan and it shows up straight away.</p>
        )}
        <ol className="flex flex-col gap-5">
          {days.map(([day, list]) => (
            <li key={day}>
              <h2 className="label-caps mb-2">{day}</h2>
              <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {list.map((r) => (
                  <Row key={r.id} row={r} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ row }: { row: LogRow }) {
  const m = meta(row.kind);
  const Icon = row.kind === "attempt" && row.payload.correct === false ? XCircle : m.icon;
  const { title, detail } = describe(row);
  const before = num(row.payload.masteryBefore);
  const after = num(row.payload.masteryAfter);
  const transcript = str(row.payload.transcript);
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60">
      <Icon className={cn("mt-0.5 size-4", row.kind === "attempt" && row.payload.correct === false ? "text-weak" : m.tone)} aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-sm">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
        {transcript && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 italic">&ldquo;{transcript}&rdquo;</p>}
      </div>
      <div className="flex flex-col items-end gap-0.5 font-mono text-[11px] text-muted-foreground tabular">
        <span>{timeLabel(row.at)}</span>
        {before !== null && after !== null && (
          <span>
            <span style={{ color: masteryColor(before) }}>{fmt2(before)}</span> → <span style={{ color: masteryColor(after) }}>{fmt2(after)}</span>
          </span>
        )}
      </div>
    </li>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number | null }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        active ? "border-accent/60 bg-accent/10 text-foreground" : "border-border bg-surface text-muted-foreground",
      )}
    >
      {label}
      {count !== null && <span className="font-mono tabular">{count}</span>}
    </button>
  );
}
