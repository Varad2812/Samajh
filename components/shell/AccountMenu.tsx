"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudAlert, CloudCheck, History, LogIn, LogOut } from "lucide-react";
import { signOut, useAccount } from "@/lib/account";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Avatar + sync state; sign in link for guests. */
export function AccountMenu() {
  const router = useRouter();
  const { status, user, lastSavedAt, saveError } = useAccount();

  if (status === "loading") return <span className="size-8 animate-pulse rounded-full bg-surface-2" aria-hidden />;
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <LogIn className="size-4" aria-hidden /> <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const SyncIcon = saveError ? CloudAlert : CloudCheck;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account: ${user.name}`}
        className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-display text-xs font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
      >
        {initials(user.name) || "?"}
        <span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-bg ${saveError ? "bg-developing" : "bg-proficient"}`} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm text-foreground">{user.name}</span>
            <span className="block truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal">
            <SyncIcon className={`size-3.5 ${saveError ? "text-developing" : "text-proficient"}`} aria-hidden />
            {saveError
              ? "Couldn't save: retrying on next change"
              : lastSavedAt
                ? `Saved ${new Date(lastSavedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Progress syncs to your account"}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/student/activity")}>
          <History /> Activity log
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
