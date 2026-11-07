import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { LiveMetar } from "@aerolearn/shared";
import { api, timeAgo } from "../api";

const QUICK: [string, string][] = [["RPLL", "Manila"], ["RPVM", "Mactan-Cebu"], ["RPLC", "Clark"], ["WSSS", "Singapore"], ["RJTT", "Tokyo Haneda"], ["EGLL", "London Heathrow"], ["KJFK", "New York JFK"]];
const CAT_COLOR = { VFR: "#2563eb", MVFR: "#60a5fa", IFR: "#ec4899", LIFR: "#be185d" } as const;
const COVER = { SKC: "Sky clear", CLR: "Clear", FEW: "Few", SCT: "Scattered", BKN: "Broken", OVC: "Overcast", OVX: "Obscured", VV: "Vertical visibility", CAVOK: "CAVOK" } as Record<string, string>;

function ZuluClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <div className="card clock-card"><div className="label">Zulu time (UTC)</div><div className="clock">{now.toISOString().slice(11, 19)}Z</div><p className="sub small">Your local time: {now.toLocaleTimeString()}</p></div>;
}

function MetarCard({ m }: { m: LiveMetar }) {
  const wind = m.windKt === 0 ? "Calm" : m.windKt === null ? "—" : `${m.windDir === "VRB" ? "Variable" : `${String(m.windDir).padStart(3, "0")}°`} at ${m.windKt} kt${m.gustKt ? `, gusting ${m.gustKt}` : ""}`;
  return (
    <article className="card metar">
      <header className="metar-head">
        <div><b className="icao">{m.icao}</b> <span className="sub">{m.name}</span></div>
        {m.category && <span className="cat-flag" style={{ background: CAT_COLOR[m.category] }}>{m.category}</span>}
      </header>
      <code className="metar-raw">{m.raw}</code>
      <div className="metar-grid">
        <div><small>Wind</small><b>{wind}</b></div>
        <div><small>Visibility</small><b>{m.visibility ?? "—"}</b></div>
        <div><small>Temp / dew point</small><b>{m.tempC ?? "—"}° / {m.dewpointC ?? "—"}°C</b></div>
        <div><small>QNH</small><b>{m.altimeterHpa ? `${Math.round(m.altimeterHpa)} hPa` : "—"}</b></div>
        <div className="wide"><small>Clouds</small><b>{m.clouds.length ? m.clouds.map((c) => `${COVER[c.cover] ?? c.cover}${c.baseFt !== null ? ` ${c.baseFt.toLocaleString()} ft` : ""}`).join(" · ") : "None reported"}</b></div>
      </div>
      {m.observed && <p className="sub small">Observed {timeAgo(m.observed)} ({m.observed.slice(11, 16)}Z)</p>}
    </article>
  );
}

export function LivePage() {
  const [ids, setIds] = useState("RPLL,RPVM");
  const [metars, setMetars] = useState<LiveMetar[] | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);

  const load = async (list: string) => {
    setBusy(true); setError("");
    try {
      const r = await api<{ metars: LiveMetar[] }>(`/live/metar?ids=${encodeURIComponent(list.replace(/\s+/g, "").toUpperCase())}`);
      setMetars(r.metars);
      if (!r.metars.length) setError("No recent reports for those codes. Check they're valid 4-letter ICAO airport codes.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(ids); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => { e.preventDefault(); load(ids); };
  return (
    <section>
      <h2>Live weather</h2>
      <p className="sub">Real METAR reports from airports around the world, decoded. New to METARs? Try <Link to="/missions">Mission 004: Weather Watch</Link> first.</p>
      <div className="grid live-top">
        <ZuluClock />
        <form className="card form" onSubmit={submit}>
          <div className="label">Airports</div>
          <div className="row"><input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="ICAO codes, e.g. RPLL,WSSS" aria-label="ICAO codes" /><button className="btn" disabled={busy}>{busy ? "Loading…" : "Get weather"}</button></div>
          <div className="chips">{QUICK.map(([c, n]) => <button type="button" key={c} className="chip" onClick={() => { setIds(c); load(c); }}>{c} · {n}</button>)}</div>
        </form>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid metars mt">{metars?.map((m) => <MetarCard key={m.icao} m={m} />)}</div>
      <p className="sub small mt">Data: aviationweather.gov (NOAA), refreshed at most every 5 minutes. For education only — never use AeroLearn for real flight planning.</p>
    </section>
  );
}
