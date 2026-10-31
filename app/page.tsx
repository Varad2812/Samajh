import Link from "next/link";
import { ArrowRight, AudioLines, GraduationCap, Orbit, School, Tag } from "lucide-react";
import { CHAPTERS, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTIONS } from "@/lib/data/misconceptions";
import { QUESTIONS } from "@/lib/data/questions";
import { TEACHER_NAME } from "@/lib/data/students";

const STEPS = [
  { icon: AudioLines, title: "Speak your reasoning", example: "“umm so the first bulb uses up some current… wait no”", tone: "text-developing" },
  { icon: Tag, title: "We find the misconception", example: "MC01 · Current used up", tone: "text-misconception" },
  { icon: Orbit, title: "Your galaxy adapts", example: "C1 Charge & current .34 → .51", tone: "text-mastered" },
];

export default function Landing() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 py-6 lg:py-12">
      <section className="flex flex-col gap-4">
        <span className="label-caps">CBSE Class 10 Physics · {CONCEPTS.length} concepts · {QUESTIONS.length} questions</span>
        <h1 className="max-w-3xl text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">
          The tutor that listens to <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">how you think.</span>
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Tap an answer, then say <em>why</em> out loud. Samajh cleans your speech, reads hesitation as confidence, and spots the
          misconception even when your final answer is right.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/student" className="panel group flex flex-col gap-4 p-4 transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-accent" aria-hidden />
            <span className="font-display text-xl font-semibold">Student · Aarav</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CHAPTERS.map((ch) => (
              <div key={ch.id} className="rounded-lg bg-surface-2 p-2">
                <div className="text-xs text-muted-foreground">{ch.short}</div>
                <div className="font-mono text-sm tabular">{CONCEPTS.filter((c) => c.chapter === ch.id).length} nodes</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">12-question adaptive diagnostic, then practice targeted at your weakest prerequisites.</p>
        </Link>
        <Link href="/teacher" className="panel group flex flex-col gap-4 p-4 transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <div className="flex items-center gap-2">
            <School className="size-5 text-accent-2" aria-hidden />
            <span className="font-display text-xl font-semibold">Teacher · {TEACHER_NAME}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Students" value="31" />
            <Stat label="Misconceptions tracked" value={String(MISCONCEPTIONS.length)} />
            <Stat label="Heatmap cells" value={String(31 * CONCEPTS.length)} />
          </div>
          <p className="text-xs text-muted-foreground">Class X-ray: who is stuck, on which concept, and the shared wrong belief behind it.</p>
        </Link>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, example, tone }, i) => (
          <div key={title} className="panel flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground tabular">0{i + 1}</span>
              <Icon className={`size-4 ${tone}`} aria-hidden />
              <span className="font-medium">{title}</span>
            </div>
            <p className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-muted-foreground">{example}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular">{value}</div>
    </div>
  );
}
