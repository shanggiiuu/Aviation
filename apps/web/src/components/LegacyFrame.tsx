// Shows a page of the classic AeroLearn site inside the React app, until that page is ported.
// The iframe stays mounted across these routes; URL changes are passed in as hash changes (no reload),
// and navigation inside the classic site is reported back so the address bar stays in step.
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSync } from "../sync";
import { hashForPath, pathForHash } from "../legacy";

export function LegacyFrame() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { ready, legacyVersion } = useSync();
  const ref = useRef<HTMLIFrameElement>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Only rebuild the src when the frame must reload (e.g. progress replaced after sign-in), not on every navigation.
  const src = useMemo(() => `/legacy/index.html?embed=1${hashForPath(pathRef.current)}`, [legacyVersion]);

  useEffect(() => {
    const w = ref.current?.contentWindow;
    const want = hashForPath(pathname);
    try { if (w && w.location.hash !== want && pathForHash(w.location.hash) !== pathname) w.location.hash = want; } catch { /* not loaded yet */ }
  }, [pathname]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow) return;
      const d = e.data as { type?: string; hash?: string; to?: string };
      if (d.type === "aero:route" && typeof d.hash === "string") {
        const p = pathForHash(d.hash);
        if (p !== pathRef.current) navigate(p, { replace: true });
      } else if (d.type === "aero:navigate" && typeof d.to === "string" && d.to.startsWith("/")) navigate(d.to);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  if (!ready) return <div className="frame-loading">✈ Loading your progress…</div>;
  return <iframe ref={ref} key={legacyVersion} className="legacy-frame" src={src} title="AeroLearn lessons and tools" />;
}
