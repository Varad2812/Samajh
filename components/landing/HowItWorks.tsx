import { ArrowRight, AudioLines, Orbit, Tag } from "lucide-react";

/** "Speak your reasoning → We find the misconception → Your galaxy adapts", each with a tiny worked example. */
export function HowItWorks() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-8" aria-labelledby="how-title">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="how-title" className="font-display text-xl font-semibold">How it works</h2>
        <span className="text-sm text-muted-foreground">One question, about 30 seconds, from messy speech to an updated learner model.</span>
      </div>
      <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <li className="panel flex flex-col gap-3 p-4">
          <Step n={1} icon={<AudioLines className="size-4 text-developing" aria-hidden />} title="Speak your reasoning" />
          <p className="rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed">
            <span className="text-muted-foreground/70 line-through">umm</span> so the first bulb{" "}
            <span className="underline decoration-misconception decoration-2 underline-offset-4">uses up some of the current</span>…{" "}
            <span className="rounded-sm bg-developing/20 px-0.5 text-developing">wait no</span>{" "}
            <span className="underline decoration-dotted underline-offset-4">I think</span> it&apos;s the same?
          </p>
          <p className="text-xs text-muted-foreground">Dictated with Wispr Flow. Fillers, self-corrections and hedges are kept, then cleaned.</p>
        </li>
        <Arrow />
        <li className="panel flex flex-col gap-3 p-4">
          <Step n={2} icon={<Tag className="size-4 text-misconception" aria-hidden />} title="We find the misconception" />
          <div className="flex flex-col gap-2 rounded-lg border border-misconception/30 bg-misconception/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-misconception/15 px-2 py-0.5 font-mono text-misconception">MC01</span>
              <span className="font-medium">Current used up</span>
              <span className="ml-auto font-mono text-muted-foreground tabular">conf .38</span>
            </div>
            <span className="text-muted-foreground">Root cause: likely <span className="font-mono text-developing">C1</span> Electric charge &amp; current</span>
          </div>
          <p className="text-xs text-muted-foreground">Matched against 17 catalogued misconceptions; the evidence quote is verbatim.</p>
        </li>
        <Arrow />
        <li className="panel flex flex-col gap-3 p-4">
          <Step n={3} icon={<Orbit className="size-4 text-mastered" aria-hidden />} title="Your galaxy adapts" />
          <div className="flex items-center gap-4 rounded-lg bg-surface-2 p-3">
            <span className="relative flex size-10 shrink-0 items-center justify-center" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-developing/30 blur-md" />
              <span className="absolute inset-1 rounded-full border border-developing/40" />
              <span className="size-4 rounded-full bg-developing shadow-[0_0_14px_var(--developing)]" />
            </span>
            <div className="font-mono text-xs tabular">
              <div>C1 Charge &amp; current</div>
              <div>
                <span className="text-weak">.18</span> <span className="text-muted-foreground">→</span> <span className="text-developing">.52</span>
                <span className="ml-2 text-mastered">▲</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">BKT + Elo + SM-2 update the model; the next question probes the root cause.</p>
        </li>
      </ol>
    </section>
  );
}

function Step({ n, icon, title }: { n: number; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground tabular">0{n}</span>
      {icon}
      <span className="font-medium">{title}</span>
    </div>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="hidden items-center md:flex">
      <ArrowRight className="size-4 text-muted-foreground" />
    </li>
  );
}
