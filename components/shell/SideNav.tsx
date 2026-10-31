"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, History, Home, PencilLine, RefreshCw, School, WandSparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueConceptIds, useStore, useVirtualNow } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra paths that light this item. */
  also?: string[];
}

const ITEMS: NavItem[] = [
  { href: "/student", label: "Home", icon: Home },
  { href: "/student/create", label: "Build a test (any subject)", icon: WandSparkles, also: ["/student/test", "/student/report"] },
  { href: "/student/diagnostic", label: "Diagnostic", icon: ClipboardCheck },
  { href: "/student/practice", label: "Practice", icon: PencilLine },
  { href: "/student/review", label: "Review", icon: RefreshCw },
  { href: "/student/activity", label: "Activity log", icon: History },
  { href: "/teacher", label: "Teacher", icon: School },
];

export function SideNav() {
  const pathname = usePathname();
  const at = useVirtualNow();
  const schedule = useStore((s) => s.schedule);
  const dueCount = at === null ? 0 : dueConceptIds(schedule, at).length;

  return (
    <nav
      aria-label="Main"
      className="sticky top-14 flex h-[calc(100dvh-3.5rem)] w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-bg/60 py-3"
    >
      {ITEMS.map(({ href, label, icon: Icon, also }) => {
        const active = href === "/student" ? pathname === href : [href, ...(also ?? [])].some((p) => pathname.startsWith(p));
        const badge = href === "/student/review" && dueCount > 0 ? dueCount : null;
        return (
          <Tooltip key={href}>
            <TooltipTrigger
              render={<Link href={href} aria-label={badge ? `${label}, ${badge} due` : label} />}
              className={cn(
                "relative flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                active && "bg-surface-2 text-accent hover:text-accent",
              )}
            >
              {active && <span className="absolute top-2 bottom-2 -left-2.5 w-0.5 rounded-full bg-accent" aria-hidden />}
              <Icon className="size-5" aria-hidden />
              {badge !== null && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-bg tabular">
                  {badge}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
