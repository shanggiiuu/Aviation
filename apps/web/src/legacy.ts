// Bridge to the classic AeroLearn site (public/legacy), which keeps progress in localStorage as "sky_<key>".
// It runs in a same-origin iframe, so both share localStorage and can talk with postMessage.
import { SYNC_KEYS, type Progress } from "@aerolearn/shared";

const PREFIX = "sky_";
const read = (k: string) => { try { const v = localStorage.getItem(k); return v === null ? undefined : JSON.parse(v); } catch { return undefined; } };
const write = (k: string, v: unknown) => { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const isSyncStorageKey = (key: string | null) => !!key && key.startsWith(PREFIX) && (SYNC_KEYS as readonly string[]).includes(key.slice(PREFIX.length));

export function readLocalProgress(): Progress {
  const out: Progress = {};
  for (const k of SYNC_KEYS) { const v = read(PREFIX + k); if (v !== undefined) out[k] = v; }
  return out;
}
/** Replace this device's progress with `data` and point the classic site at its default ("guest") slot. */
export function writeLocalProgress(data: Progress) {
  write(PREFIX + "current", "guest");
  for (const k of SYNC_KEYS) write(PREFIX + k, data[k]);
}
export function clearLocalProgress() { for (const k of SYNC_KEYS) write(PREFIX + k, undefined); }

export const getPref = <T extends string>(k: "theme" | "lang", fallback: T): T => (read(PREFIX + k) as T) ?? fallback;
export const setPref = (k: "theme" | "lang", v: string) => write(PREFIX + k, v);

// ---- URL ↔ classic-site hash ----
// /academy ↔ #academy, /atc/sim ↔ #atc/sim, /missions ↔ #quiz, / ↔ #home
export const LEGACY_PAGES = ["dashboard", "academy", "lab", "ops", "atc", "dictionary", "aircraft", "careers", "missions", "shop"];
export function hashForPath(pathname: string) {
  let p = pathname.replace(/^\/+|\/+$/g, "");
  if (p === "missions" || p.startsWith("missions/")) p = "quiz" + p.slice(8);
  return "#" + (p || "home");
}
export function pathForHash(hash: string) {
  let h = hash.replace(/^#/, "");
  if (!h || h === "home") return "/";
  if (h === "quiz" || h.startsWith("quiz/")) h = "missions" + h.slice(4);
  return "/" + h;
}
export function postToLegacy(frame: HTMLIFrameElement | null, msg: Record<string, unknown>) {
  frame?.contentWindow?.postMessage(msg, location.origin);
}
