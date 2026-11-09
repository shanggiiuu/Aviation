// Theme and language: stored under the same keys as the classic site and pushed into its iframe.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getPref, postToLegacy, setPref } from "./legacy";

export type Lang = "en" | "fil";
type Theme = "day" | "night";
const frame = () => document.querySelector<HTMLIFrameElement>("iframe.legacy-frame");

const STRINGS = {
  en: { home: "Home", dashboard: "Dashboard", academy: "Academy", lab: "Lab", ops: "Airport", atc: "ATC & Comms", dictionary: "Dictionary",
    aircraft: "Aircraft", careers: "Careers", missions: "Missions", shop: "Shop", community: "Community", live: "Live weather", signIn: "Sign in",
    saved: "Saved", syncing: "Saving…", syncError: "Not saved — retrying when you continue", local: "Progress saved on this device only" },
  fil: { home: "Tahanan", dashboard: "Dashboard", academy: "Akademya", lab: "Lab", ops: "Paliparan", atc: "ATC at Komunikasyon", dictionary: "Diksiyonaryo",
    aircraft: "Mga Eroplano", careers: "Mga Karera", missions: "Mga Misyon", shop: "Tindahan", community: "Komunidad", live: "Live na panahon", signIn: "Mag-sign in",
    saved: "Naka-save", syncing: "Nagse-save…", syncError: "Hindi na-save — susubukan ulit", local: "Sa device na ito lang naka-save ang progreso" },
} as const;
export type StringKey = keyof (typeof STRINGS)["en"];

interface Prefs { theme: Theme; lang: Lang; toggleTheme: () => void; setLang: (l: Lang) => void; t: (k: StringKey) => string }
const PrefsCtx = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || "day");
  const [lang, setLangState] = useState<Lang>(() => {
    const l = getPref<Lang | "">("lang", "");
    return l === "en" || l === "fil" ? l : /^(fil|tl)\b/i.test(navigator.language) ? "fil" : "en";
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const toggleTheme = useCallback(() => setTheme((t) => {
    const next = t === "night" ? "day" : "night";
    setPref("theme", next); postToLegacy(frame(), { type: "aero:theme", theme: next });
    return next;
  }), []);
  const setLang = useCallback((l: Lang) => { setLangState(l); setPref("lang", l); postToLegacy(frame(), { type: "aero:lang", lang: l }); }, []);
  const t = useCallback((k: StringKey) => STRINGS[lang][k], [lang]);

  return <PrefsCtx.Provider value={{ theme, lang, toggleTheme, setLang, t }}>{children}</PrefsCtx.Provider>;
}
export function usePrefs() {
  const v = useContext(PrefsCtx);
  if (!v) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return v;
}
