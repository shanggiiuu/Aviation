// Keeps the classic site's localStorage progress in sync with the signed-in account.
//  • On sign-in: merge this device's progress with the account's (nothing is lost), write the result back locally.
//  • While signed in: whenever the classic site saves progress, autosave the snapshot to the server (debounced).
//  • On sign-out: save one last time, then clear this device so the next person starts fresh.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Progress } from "@aerolearn/shared";
import { api } from "./api";
import { useAuth } from "./auth";
import { clearLocalProgress, isSyncStorageKey, readLocalProgress, writeLocalProgress } from "./legacy";

type Status = "local" | "syncing" | "saved" | "error";
interface SyncState {
  ready: boolean;          // safe to show the classic site (progress is in place)
  status: Status;
  progress: Progress;      // latest snapshot (for the header XP and the profile page)
  legacyVersion: number;   // bump to reload the classic-site iframe after progress changes underneath it
  signOut: () => Promise<void>;
}
const SyncCtx = createContext<SyncState | null>(null);
const DEBOUNCE_MS = 1500;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("local");
  const [progress, setProgress] = useState<Progress>(() => readLocalProgress());
  const [legacyVersion, setLegacyVersion] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const userId = user?.id ?? null;

  const save = useCallback(async (keepalive = false) => {
    window.clearTimeout(timer.current); timer.current = undefined;
    setStatus("syncing");
    try { await api("/progress", { method: "PUT", body: { data: readLocalProgress() }, keepalive }); setStatus("saved"); }
    catch { setStatus("error"); }
  }, []);

  // sign-in / sign-out transitions
  useEffect(() => {
    if (loading) return;
    if (!userId) { setStatus("local"); setReady(true); return; }
    let cancelled = false;
    setReady(false); setStatus("syncing");
    api<{ data: Progress }>("/progress/merge", { method: "POST", body: { data: readLocalProgress() } })
      .then((r) => { if (cancelled) return; writeLocalProgress(r.data); setProgress(r.data); setStatus("saved"); setLegacyVersion((v) => v + 1); })
      .catch(() => !cancelled && setStatus("error"))
      .finally(() => !cancelled && setReady(true));
    return () => { cancelled = true; };
  }, [userId, loading]);

  // the classic site (in its iframe) writes localStorage → "storage" events fire here
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!isSyncStorageKey(e.key)) return;
      setProgress(readLocalProgress());
      if (!userId) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => save(), DEBOUNCE_MS);
    };
    const onHide = () => { if (userId && timer.current) save(true); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onHide);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("pagehide", onHide); };
  }, [userId, save]);

  const signOut = useCallback(async () => {
    if (timer.current) await save();
    await logout();
    clearLocalProgress(); setProgress({}); setLegacyVersion((v) => v + 1);
  }, [logout, save]);

  return <SyncCtx.Provider value={{ ready, status, progress, legacyVersion, signOut }}>{children}</SyncCtx.Provider>;
}

export function useSync() {
  const v = useContext(SyncCtx);
  if (!v) throw new Error("useSync must be used inside <SyncProvider>");
  return v;
}
