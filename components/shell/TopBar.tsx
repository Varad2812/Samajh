"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, GraduationCap, Orbit, RotateCcw, School, Sparkles } from "lucide-react";
import { TEACHER_NAME } from "@/lib/data/students";
import { fx, useStore, type Role } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountMenu } from "./AccountMenu";
import { OfflineChip } from "./OfflineChip";
import { VirtualClock } from "./VirtualClock";

const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher" };

export function TopBar() {
  const router = useRouter();
  const role = useStore((s) => s.settings.role);
  const studentName = useStore((s) => s.student.name);
  const setRole = useStore((s) => s.setRole);
  const resetDemo = useStore((s) => s.resetDemo);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);

  const switchTo = (next: Role) => {
    setRole(next);
    router.push(next === "teacher" ? "/teacher" : "/student");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg pr-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span className="relative flex size-6 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-accent-2 opacity-30 blur-[6px]" />
          <span className="size-3 rounded-full bg-gradient-to-br from-accent to-accent-2 ring-2 ring-accent/30" />
        </span>
        <span className="font-display text-base font-semibold tracking-tight">Samajh</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none aria-expanded:bg-surface-2">
          {role === "teacher" ? <School className="size-4" aria-hidden /> : <GraduationCap className="size-4" aria-hidden />}
          <span className="hidden sm:inline">{ROLE_LABEL[role]}</span>
          <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>View as</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => switchTo("student")}>
              <GraduationCap /> Student · {studentName}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchTo("teacher")}>
              <School /> Teacher · {TEACHER_NAME}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={loadDemoProfile}>
            <Sparkles /> Load demo profile
            <span className="ml-auto font-mono text-xs text-muted-foreground">⇧D</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (window.location.pathname !== "/student") router.push("/student");
              // Let the galaxy mount before the event fires.
              window.setTimeout(fx.ignite, 400);
            }}
          >
            <Orbit /> Replay galaxy ignition
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <VirtualClock />
        <OfflineChip />
        <Tooltip>
          <TooltipTrigger
            onClick={resetDemo}
            aria-label="Reset demo"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:translate-y-px"
          >
            <RotateCcw className="size-4" aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset demo (clears progress and clock)</TooltipContent>
        </Tooltip>
        <AccountMenu />
      </div>
    </header>
  );
}
