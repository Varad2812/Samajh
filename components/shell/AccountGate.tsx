"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAccount } from "@/lib/account";

const PROTECTED = ["/student", "/teacher"];

/** Holds signed-in pages until the account snapshot has loaded, so nobody sees another device's progress. */
export function AccountGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const status = useAccount((s) => s.status);
  const syncing = useAccount((s) => s.syncing);
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected || (status === "authed" && !syncing)) return children;
  return (
    <div className="starfield-loading panel flex h-[60vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
      {status === "guest" ? "Taking you to sign in…" : "Loading your galaxy…"}
    </div>
  );
}
