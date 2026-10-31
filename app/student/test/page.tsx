"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { TestRunner } from "@/components/tracks/TestRunner";
import { scoreTrack } from "@/lib/tracks/score";
import { useStore } from "@/lib/store";

export default function TakeTestPage() {
  const router = useRouter();
  const track = useStore((s) => s.tracks.find((t) => t.id === s.activeTrackId) ?? null);
  const saveTrackResult = useStore((s) => s.saveTrackResult);

  if (!track) {
    return (
      <div className="panel mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
        <Sparkles className="size-6 text-accent" aria-hidden />
        <h1 className="font-display text-lg font-semibold">No test selected</h1>
        <p className="text-sm text-muted-foreground">Build a test for any subject, or pick one of your saved tests.</p>
        <Link href="/student/create" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          Build a test
        </Link>
      </div>
    );
  }

  return (
    <TestRunner
      // Remount (fresh answers and timer) when a different test becomes active.
      key={track.id}
      track={track}
      onFinish={(answers, startedAt) => {
        saveTrackResult(scoreTrack(track, answers, startedAt, Date.now()));
        router.push("/student/report");
      }}
    />
  );
}
