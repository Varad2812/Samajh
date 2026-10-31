"use client";

/** Signed-in account (not persisted: the session lives in an httpOnly cookie) and calls to the auth/log routes. */
import { create } from "zustand";
import { persistedSlice, useStore, type PersistedState, type Role } from "@/lib/store";

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
}

export type AccountStatus = "loading" | "guest" | "authed";

export interface LogEvent {
  kind: string;
  payload?: Record<string, unknown>;
  at?: number;
}

interface AccountState {
  status: AccountStatus;
  user: AccountUser | null;
  /** True while the account snapshot is being loaded (blocks saving). */
  syncing: boolean;
  lastSavedAt: number | null;
  saveError: boolean;
}

export const useAccount = create<AccountState>()(() => ({ status: "loading", user: null, syncing: false, lastSavedAt: null, saveError: false }));

const LOCAL_KEY = "samajh-v1";
const json = { "Content-Type": "application/json" };

async function asJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** Load the account's saved progress into the store (fresh profile for a new account). */
async function adopt(user: AccountUser): Promise<void> {
  useAccount.setState({ syncing: true, status: "authed", user });
  try {
    const { data } = await asJson<{ data: Partial<PersistedState> | null }>(await fetch("/api/state", { cache: "no-store" }));
    useStore.getState().loadAccount(user, data);
  } catch {
    // Keep whatever is on this device; it will be saved on the next change.
  } finally {
    useAccount.setState({ syncing: false });
  }
}

export async function bootstrapAccount(): Promise<void> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) {
      useAccount.setState({ status: "guest", user: null });
      return;
    }
    const { user } = (await res.json()) as { user: AccountUser };
    await adopt(user);
  } catch {
    useAccount.setState({ status: "guest", user: null });
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { user } = await asJson<{ user: AccountUser }>(
    await fetch("/api/auth/login", { method: "POST", headers: json, body: JSON.stringify({ email, password }) }),
  );
  await adopt(user);
}

export async function signUp(input: { email: string; name: string; password: string; role: Role }): Promise<void> {
  const { user } = await asJson<{ user: AccountUser }>(await fetch("/api/auth/signup", { method: "POST", headers: json, body: JSON.stringify(input) }));
  await adopt(user);
}

export async function signOut(): Promise<void> {
  await flushState();
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  useAccount.setState({ status: "guest", user: null, lastSavedAt: null });
  // Nothing of this account stays on a shared device.
  useStore.getState().resetDemo();
  useStore.setState((s) => ({ student: { ...s.student, name: "Student" }, studyPlan: null, tracks: [], activeTrackId: null }));
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export async function saveState(): Promise<void> {
  const { status, syncing, user } = useAccount.getState();
  if (status !== "authed" || syncing || !user) return;
  try {
    const res = await fetch("/api/state", { method: "PUT", headers: json, body: JSON.stringify({ userId: user.id, data: persistedSlice(useStore.getState()) }) });
    if (res.status === 409) {
      // Signed in as someone else in another tab: load that account instead of overwriting it.
      await bootstrapAccount();
      return;
    }
    const { updatedAt } = await asJson<{ updatedAt: number }>(res);
    useAccount.setState({ lastSavedAt: updatedAt, saveError: false });
  } catch {
    useAccount.setState({ saveError: true });
  }
}

/** Best-effort save that survives the tab closing. */
export function beaconState(): void {
  const { status, user } = useAccount.getState();
  if (status !== "authed" || !user) return;
  const blob = new Blob([JSON.stringify({ userId: user.id, data: persistedSlice(useStore.getState()) })], { type: "application/json" });
  navigator.sendBeacon("/api/state", blob);
}

let pendingSave: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave(delayMs = 1200): void {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(() => {
    pendingSave = null;
    void saveState();
  }, delayMs);
}

export async function flushState(): Promise<void> {
  if (!pendingSave) return;
  clearTimeout(pendingSave);
  pendingSave = null;
  await saveState();
}

export async function logEvents(events: LogEvent[]): Promise<void> {
  const { status, user } = useAccount.getState();
  if (!events.length || status !== "authed" || !user) return;
  for (let i = 0; i < events.length; i += 100) {
    await fetch("/api/logs", { method: "POST", headers: json, body: JSON.stringify({ userId: user.id, events: events.slice(i, i + 100) }) }).catch(() => undefined);
  }
}

export interface LogRow {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  at: number;
}

export async function fetchLogs(limit = 300): Promise<{ logs: LogRow[]; counts: Record<string, number> }> {
  return asJson(await fetch(`/api/logs?limit=${limit}`, { cache: "no-store" }));
}
