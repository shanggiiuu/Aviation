import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { rankFor } from "@aerolearn/shared";
import { useAuth } from "../auth";
import { useSync } from "../sync";
import { usePrefs, type StringKey } from "../prefs";
import { STATIC } from "../config";

const NAV: [string, StringKey][] = [
  ["/", "home"], ["/dashboard", "dashboard"], ["/academy", "academy"], ["/lab", "lab"], ["/ops", "ops"], ["/atc", "atc"],
  ["/dictionary", "dictionary"], ["/aircraft", "aircraft"], ["/careers", "careers"], ["/missions", "missions"], ["/shop", "shop"],
  ["/live", "live"],
].filter(([to]) => !STATIC || to !== "/live") as [string, StringKey][];

export function Layout({ legacy = false }: { legacy?: boolean }) {
  const { user } = useAuth();
  const { status, progress } = useSync();
  const { theme, toggleTheme, lang, setLang, t } = usePrefs();
  const { pathname } = useLocation();
  const xp = typeof progress.xp === "number" ? progress.xp : 0;
  const coins = useCoinBalance();
  const statusText = user ? (status === "syncing" ? t("syncing") : status === "error" ? t("syncError") : t("saved")) : t("local");
  // On phones the page links fold into a menu; it closes whenever the page changes.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    // Tapping the page (often the classic-site frame, which takes focus away from this window) closes the menu.
    const close = () => setMenuOpen(false);
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".topbar")) close(); };
    window.addEventListener("blur", close);
    document.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("blur", close); document.removeEventListener("pointerdown", onDown); };
  }, [menuOpen]);
  const langSelect = (cls: string) => (
    <select className={cls} value={lang} onChange={(e) => setLang(e.target.value as "en" | "fil")} aria-label="Language / Wika">
      <option value="en">English</option><option value="fil">Filipino</option>
    </select>
  );

  return (
    <div className={legacy ? "app app-legacy" : "app"}>
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-icon">✈</span> Aero<b>Learn</b></Link>
        <nav id="main-nav" className={menuOpen ? "nav open" : "nav"} aria-label="Main">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive || (to !== "/" && pathname.startsWith(to + "/")) ? "active" : "")}>{t(key)}</NavLink>
          ))}
          {langSelect("lang-sel nav-lang")}
        </nav>
        <div className="top-tools">
          {langSelect("lang-sel top-lang")}
          <button type="button" className="icon-btn" onClick={toggleTheme} title={theme === "night" ? "Switch to day mode" : "Switch to night mode"} aria-label="Toggle day/night mode">
            {theme === "night" ? "☀️" : "🌙"}
          </button>
          <Link className="account-chip" to={user || STATIC ? "/profile" : "/login"} title={statusText}>
            <span>{user ? user.avatar : "👤"}</span>
            <span className="acct-name">{user ? user.displayName : STATIC ? t("profile") : t("signIn")}</span>
            <span className="xp">⭐ {xp} XP · {rankFor(xp).name}</span>
            {coins !== null && <span className="xp coins" title="Aero Coins">🪙 {coins.toLocaleString()}</span>}
            <span className={`sync-dot ${user ? status : "local"}`} aria-label={statusText} />
          </Link>
          <button type="button" className="icon-btn menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="main-nav" aria-label="Menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>
      <main className={legacy ? "main-legacy" : "main"}><Outlet /></main>
    </div>
  );
}

// The classic site's shop works out the spendable Aero Coin balance and leaves it in localStorage for this top bar.
function useCoinBalance() {
  const read = () => { try { const v = JSON.parse(localStorage.getItem("sky_coinbal") ?? "null"); return typeof v === "number" ? v : null; } catch { return null; } };
  const [coins, setCoins] = useState<number | null>(read);
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === "sky_coinbal" || e.key === null) setCoins(read()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  return coins;
}
