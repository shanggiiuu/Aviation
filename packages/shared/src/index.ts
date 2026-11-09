// Shared between the React frontend and the API: validation schemas, constants and progress merging.
import { z } from "zod";

// ---------- Accounts ----------
export const AVATARS = ["🧑‍✈️", "👩‍✈️", "👨‍✈️", "🛩", "🚁", "🪂", "🛰", "🌤", "🧭", "🎧"] as const;
export const GOALS = ["Just curious", "Future student pilot", "Student pilot", "Aviation enthusiast", "Future air traffic controller", "Cabin crew / airline staff"] as const;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  displayName: z.string().trim().min(1).max(30),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(30).optional(),
  avatar: z.enum(AVATARS).optional(),
  goal: z.enum(GOALS).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  goal: string | null;
  createdAt: string;
}

// ---------- Ranks (same thresholds as the classic site) ----------
export const RANKS: [number, string][] = [[0, "Cadet"], [50, "Student Pilot"], [150, "Private Pilot"], [300, "Instrument Rated"], [600, "Commercial Pilot"], [1000, "Airline Captain"]];
export function rankFor(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  return { name: RANKS[i][1], floor: RANKS[i][0], next: RANKS[i + 1] ?? null };
}

// ---------- Learning progress ----------
// Keys the classic site keeps in localStorage (as "sky_<key>") that are synced to the account.
export const SYNC_KEYS = ["xp", "fav", "custom", "viewed", "lessons", "best", "quizHistory", "simBest", "simDone", "partsFound", "exBest",
  "labDone", "airportMap", "careersSeen", "careerMatch", "missions", "bookmarks", "coins", "shop"] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];
export type Progress = Partial<Record<SyncKey, unknown>>;

export const progressSchema = z.record(z.string(), z.unknown()).transform((o) => {
  const out: Progress = {};
  for (const k of SYNC_KEYS) if (k in o) out[k] = o[k];
  return out;
});

// "coins" is lifetime Aero Coins earned (never decreases); the spendable balance is derived from it minus owned items.
const MAX_KEYS = new Set<SyncKey>(["xp", "best", "simBest", "exBest", "coins"]);
const UNION_KEYS = new Set<SyncKey>(["fav", "viewed", "lessons", "labDone", "partsFound", "careersSeen", "bookmarks"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const unionBy = <T>(a: T[], b: T[], id: (x: T) => string) => {
  const seen = new Set(a.map(id));
  return [...a, ...b.filter((x) => !seen.has(id(x)) && seen.add(id(x)))];
};

/** Combine two progress snapshots without losing anything either side earned. `b` wins on plain conflicts. */
export function mergeProgress(a: Progress = {}, b: Progress = {}): Progress {
  const out: Progress = { ...a };
  for (const k of SYNC_KEYS) {
    const x = a[k], y = b[k];
    if (y === undefined) continue;
    if (x === undefined || x === null) { out[k] = y; continue; }
    if (MAX_KEYS.has(k) && typeof x === "number" && typeof y === "number") out[k] = Math.max(x, y);
    else if (k === "simDone") out[k] = Boolean(x) || Boolean(y);
    else if (UNION_KEYS.has(k) && Array.isArray(x) && Array.isArray(y)) out[k] = unionBy(x, y, (v) => JSON.stringify(v));
    else if (k === "custom" && Array.isArray(x) && Array.isArray(y)) out[k] = unionBy(x as { t?: string }[], y as { t?: string }[], (v) => String(v?.t ?? JSON.stringify(v)));
    else if (k === "quizHistory" && Array.isArray(x) && Array.isArray(y))
      out[k] = unionBy(x as { ts?: number }[], y as { ts?: number }[], (v) => String(v?.ts ?? JSON.stringify(v))).sort((p, q) => (p?.ts ?? 0) - (q?.ts ?? 0)).slice(-100);
    else if (k === "missions" && isObj(x) && isObj(y)) {
      const m: Record<string, unknown> = { ...x };
      for (const [id, r] of Object.entries(y)) {
        const prev = m[id] as { stars?: number; best?: number } | undefined, cur = r as { stars?: number; best?: number };
        m[id] = !prev ? cur : { ...prev, ...cur, stars: Math.max(prev.stars ?? 0, cur.stars ?? 0), best: Math.max(prev.best ?? 0, cur.best ?? 0) };
      }
      out[k] = m;
    } else if (k === "shop" && isObj(x) && isObj(y)) {
      // owned items are a union (a purchase on either device is kept); equipped items, names etc.: newest wins
      const own = (v: unknown) => (Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : []);
      const stats: Record<string, unknown> = { ...(isObj(x.petStats) ? x.petStats : {}) };
      for (const [id, v] of Object.entries(isObj(y.petStats) ? y.petStats : {})) {
        const p = stats[id] as { n?: number } | undefined, c = v as { n?: number };
        stats[id] = { ...p, ...c, n: Math.max(p?.n ?? 0, c?.n ?? 0) };
      }
      out[k] = { ...x, ...y, owned: [...new Set([...own(x.owned), ...own(y.owned)])], petStats: stats };
    } else out[k] = y; // airportMap, careerMatch and anything unexpected: newest wins
  }
  return out;
}

// ---------- Community ----------
export const POST_TAGS = ["General", "Radio & ATC", "Aircraft", "Training", "Weather"] as const;
export const postSchema = z.object({
  tag: z.enum(POST_TAGS),
  title: z.string().trim().min(5, "Make the title a little longer").max(120),
  body: z.string().trim().min(1).max(2000),
});
export const replySchema = z.object({ body: z.string().trim().min(1).max(2000) });
export type PostInput = z.infer<typeof postSchema>;

export interface PostSummary {
  id: string; tag: string; title: string; body: string; createdAt: string;
  author: { id: string; displayName: string; avatar: string };
  votes: number; replyCount: number; votedByMe: boolean; mine: boolean;
}
export interface Reply { id: string; body: string; createdAt: string; author: { id: string; displayName: string; avatar: string }; mine: boolean }
export interface PostDetail extends PostSummary { replies: Reply[] }

// ---------- Live weather ----------
export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";
export interface LiveMetar {
  icao: string; name: string | null; raw: string; observed: string | null;
  windDir: number | "VRB" | null; windKt: number | null; gustKt: number | null;
  visibility: string | null; tempC: number | null; dewpointC: number | null; altimeterHpa: number | null;
  clouds: { cover: string; baseFt: number | null }[];
  category: FlightCategory | null;
}
export const icaoListSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4}(,[A-Z0-9]{4}){0,9}$/, "Use 4-letter ICAO codes, comma-separated (max 10)");

/** FAA-style flight category from the lowest broken/overcast layer and visibility in statute miles. */
export function flightCategory(ceilingFt: number | null, visSm: number | null): FlightCategory | null {
  if (ceilingFt === null && visSm === null) return null;
  const c = ceilingFt ?? Infinity, v = visSm ?? Infinity;
  if (c < 500 || v < 1) return "LIFR";
  if (c < 1000 || v < 3) return "IFR";
  if (c <= 3000 || v <= 5) return "MVFR";
  return "VFR";
}
