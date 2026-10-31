import { MasteryBar } from "@/components/shared/MasteryBar";
import { CHAPTERS } from "@/lib/data/concepts";
import { chapterMean } from "@/lib/teacher/stats";
import type { StudentRecord } from "@/lib/types";

/** Class mean per chapter, plus how many students are below .40 in it. */
export function ChapterMasteryBars({ roster }: { roster: StudentRecord[] }) {
  return (
    <section className="panel flex flex-col gap-3 p-4" aria-label="Chapter mastery">
      <h2 className="label-caps">Chapter mastery (class)</h2>
      {CHAPTERS.map((ch) => {
        const mean = roster.reduce((a, s) => a + chapterMean(s, ch.id), 0) / roster.length;
        const weak = roster.filter((s) => chapterMean(s, ch.id) < 0.4).length;
        return (
          <div key={ch.id} className="flex flex-col gap-0.5">
            <MasteryBar label={ch.short} value={mean} />
            <span className="ml-[60px] font-mono text-[11px] text-muted-foreground tabular">{weak}/{roster.length} students below .40</span>
          </div>
        );
      })}
    </section>
  );
}
