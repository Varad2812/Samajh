/** remedial-worksheet offline fallback: assembled from seeded questions + misconception `correctIdea`s. */
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTIONS, questionsFor, type Question } from "@/lib/data/questions";
import type { Worksheet, WorksheetRequest } from "./schemas";

const LETTERS = ["A", "B", "C", "D"];

const asItem = (q: Question) => ({
  q: `${q.stem}\n${q.options.map((o, i) => `${LETTERS[i]}. ${o}`).join("\n")}`,
  answer: `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}. ${q.explanation}`,
});

export function offlineWorksheet(req: WorksheetRequest): Worksheet {
  const concept = CONCEPT_BY_ID[req.conceptId];
  const name = concept?.name ?? req.conceptId;
  const mcs = req.misconceptionIds.flatMap((id) => (MISCONCEPTION_BY_ID[id] ? [MISCONCEPTION_BY_ID[id]] : []));
  const own = [...questionsFor(req.conceptId)].sort((a, b) => a.elo - b.elo);
  const used = new Set<string>();
  const take = (qs: Question[], n: number) => {
    const picked = qs.filter((q) => !used.has(q.id)).slice(0, n);
    picked.forEach((q) => used.add(q.id));
    return picked;
  };

  const sections: Worksheet["sections"] = [];
  const check = take(own, 2).map(asItem);
  if (check.length) sections.push({ heading: `Concept check: ${name}`, items: check });

  for (const mc of mcs.slice(0, 3)) {
    const targeted = take(QUESTIONS.filter((q) => Object.values(q.distractorMisconceptions ?? {}).includes(mc.id)), 1).map(asItem);
    sections.push({
      heading: `Spot the error: ${mc.label}`,
      items: [{ q: `A student says: "${mc.wrongBelief}" Is this correct? Explain your answer.`, answer: `No. ${mc.correctIdea}` }, ...targeted],
    });
  }

  const apply = take([...own].reverse(), 1).map(asItem);
  if (apply.length) sections.push({ heading: "Apply it", items: apply });
  if (!sections.length) {
    sections.push({ heading: `Practice: ${name}`, items: take(QUESTIONS, 3).map(asItem) });
  }

  const stats = req.classStats;
  const ranked = mcs
    .map((m) => ({ m, pct: stats.affectedPct?.[m.id] }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const notes = [
    ranked.length
      ? `Start with ${ranked[0].m.label}${ranked[0].pct !== undefined ? ` (about ${Math.round(ranked[0].pct)}% of the class)` : ""}. ${ranked[0].m.correctIdea}`
      : `Use this as a consolidation set on ${name}.`,
    ranked.slice(1).length ? `Then cover: ${ranked.slice(1).map((r) => r.m.label).join("; ")}.` : "",
    stats.weakCount !== undefined ? `${stats.weakCount} student${stats.weakCount === 1 ? "" : "s"} are weak on this concept; consider pairing them with confident peers.` : "",
    "Let students predict first, then check; the spot-the-error items work best discussed aloud.",
  ].filter(Boolean);

  return {
    title: `Remedial worksheet: ${name}`,
    intro: `This short worksheet revisits ${name}. Read each statement carefully, decide what is really happening, and give a reason for every answer.`,
    sections,
    teacherNotes: notes.join(" "),
  };
}
