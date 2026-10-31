"use client";

import { useRouter } from "next/navigation";
import { Box, Mic, MousePointerClick, Sparkles } from "lucide-react";
import { CreateTestForm } from "@/components/tracks/CreateTestForm";
import { MyTests } from "@/components/tracks/MyTests";
import { useStore } from "@/lib/store";

const HOW = [
  { icon: Sparkles, title: "Tell us your syllabus", body: "Subject, class, board and the chapters you care about. AI maps the topics and how they depend on each other." },
  { icon: MousePointerClick, title: "Tap answers, say why", body: "Pick an option, then explain your thinking out loud (optional). Hesitation tells us how sure you really are." },
  { icon: Box, title: "See it in 3D", body: "Your topics become a galaxy coloured by mastery. Replay every wrong answer: the camera flies to the topic and shows what tripped you up." },
  { icon: Mic, title: "Fix it in 45 minutes", body: "A YouTube plan for your weakest topics, in the right order, built from the mistakes you actually made." },
];

export default function CreateTestPage() {
  const router = useRouter();
  const tracks = useStore((s) => s.tracks);
  const results = useStore((s) => s.trackResults);
  const addTrack = useStore((s) => s.addTrack);
  const setActiveTrack = useStore((s) => s.setActiveTrack);
  const removeTrack = useStore((s) => s.removeTrack);

  const open = (id: string, page: "test" | "report") => {
    setActiveTrack(id);
    router.push(`/student/${page}`);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
      <section className="panel p-5 md:p-6" aria-label="Build your test">
        <p className="label-caps">Build your own test</p>
        <h1 className="mt-1 mb-5 font-display text-2xl font-semibold tracking-tight">Any subject. Your syllabus. A test made for you.</h1>
        <CreateTestForm
          onCreated={(track) => {
            addTrack(track);
            router.push("/student/test");
          }}
          onBuiltIn={() => router.push("/student/diagnostic")}
        />
      </section>

      <aside className="flex flex-col gap-4">
        <section className="panel p-4" aria-label="How it works">
          <h2 className="label-caps mb-3">How it works</h2>
          <ol className="flex flex-col gap-3">
            {HOW.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                <span className="relative flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="size-4" aria-hidden />
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface-2 font-mono text-[9px] text-muted-foreground tabular">{i + 1}</span>
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <MyTests tracks={tracks} results={results} onTake={(id) => open(id, "test")} onReport={(id) => open(id, "report")} onRemove={removeTrack} />
      </aside>
    </div>
  );
}
