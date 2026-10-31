"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, GraduationCap, Loader2, Lock, Mic, PlayCircle, School } from "lucide-react";
import { signIn, signUp, useAccount } from "@/lib/account";
import type { Role } from "@/lib/store";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const PERKS = [
  { icon: Database, title: "Your own learner model", body: "Mastery, misconceptions and review schedule saved to your account, on any device." },
  { icon: Mic, title: "Every attempt logged", body: "Answers, spoken reasoning and confidence go into a timeline you can look back through." },
  { icon: PlayCircle, title: "45-minute video plan", body: "Gemini picks YouTube videos in order, each one mapped to a concept you're weak on." },
];

const field =
  "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-accent/30 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30";

function nextPath(role: Role): string {
  const next = new URLSearchParams(window.location.search).get("next");
  // Only same-site paths, never an absolute URL.
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return role === "teacher" ? "/teacher" : "/student";
}

export default function LoginPage() {
  const router = useRouter();
  const status = useAccount((s) => s.status);
  const user = useAccount((s) => s.user);
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authed" && user && !busy) router.replace(nextPath(user.role));
  }, [status, user, busy, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") await signUp({ email, name, password, role });
      else await signIn(email, password);
      router.replace(nextPath(useAccount.getState().user?.role ?? role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 py-4 md:grid-cols-[1.1fr_1fr] md:py-10">
      <section className="panel relative overflow-hidden p-6 md:p-8">
        <div className="starfield-loading absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <p className="label-caps">Samajh account</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            The tutor that remembers <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">how you think</span>.
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Sign in so your knowledge galaxy, misconceptions and spaced reviews follow you around, and every session is logged.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-lg border border-border bg-surface-2/70 p-3 backdrop-blur">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel p-6 md:p-8">
        <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                "h-8 rounded-md text-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                mode === m ? "bg-surface text-foreground shadow" : "text-muted-foreground",
              )}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Your name
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" placeholder="Aarav Sharma" />
              </label>
              <fieldset className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <legend className="mb-1.5">I am a</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([["student", GraduationCap, "Student"], ["teacher", School, "Teacher"]] as const).map(([r, Icon, label]) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={role === r}
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg border text-sm transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                        role === r ? "border-accent/60 bg-accent/10 text-foreground" : "border-border bg-surface-2 text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Email
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@school.in" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Password
            <input
              className={field}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-weak/30 bg-weak/10 px-3 py-2 text-xs text-weak">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" aria-hidden /> Passwords are hashed with scrypt; the session is an httpOnly cookie.
          </p>
        </form>
      </section>
    </div>
  );
}
