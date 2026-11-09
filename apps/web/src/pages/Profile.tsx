import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { AVATARS, GOALS, rankFor } from "@aerolearn/shared";
import { api } from "../api";
import { useAuth } from "../auth";
import { useSync } from "../sync";

const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);

export function ProfilePage() {
  const { user, loading, update } = useAuth();
  const { progress, status, signOut } = useSync();
  const [msg, setMsg] = useState(""), [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (loading) return <p className="sub">Loading…</p>;
  if (!user) return <Navigate to="/login?next=/profile" replace />;

  const xp = typeof progress.xp === "number" ? progress.xp : 0;
  const rank = rankFor(xp);
  const pct = rank.next ? Math.round(((xp - rank.floor) / (rank.next[0] - rank.floor)) * 100) : 100;
  const missions = (progress.missions ?? {}) as Record<string, { stars?: number }>;
  const missionDone = Object.values(missions).filter((m) => (m.stars ?? 0) > 0).length;
  const stars = Object.values(missions).reduce((n, m) => n + (m.stars ?? 0), 0);
  const bookmarks = (Array.isArray(progress.bookmarks) ? progress.bookmarks : []) as string[];
  const match = progress.careerMatch as { top?: [string, number][] } | undefined;

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setMsg(""); setError("");
    const f = new FormData(e.currentTarget);
    try {
      await update({ displayName: String(f.get("displayName")), avatar: f.get("avatar") as (typeof AVATARS)[number], goal: f.get("goal") as (typeof GOALS)[number] });
      setMsg("Profile saved.");
    } catch (err) { setError((err as Error).message); }
  };
  const del = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError("");
    try {
      await api("/me", { method: "DELETE", body: { password: String(new FormData(e.currentTarget).get("password")) } });
      await signOut();
    } catch (err) { setError((err as Error).message); }
  };

  return (
    <section>
      <div className="card pf-head">
        <span className="pf-avatar">{user.avatar}</span>
        <div className="pf-main">
          <div className="label">Learning profile</div>
          <h2 className="no-bar">{user.displayName}</h2>
          <div className="sub small">{user.goal ?? "Aviation learner"} · member since {new Date(user.createdAt).toLocaleDateString()} · {status === "saved" ? "✓ progress synced" : status === "syncing" ? "saving…" : status === "error" ? "⚠ not synced yet" : ""}</div>
          <div className="xp-bar"><div className="progress"><div className="bar" style={{ width: `${pct}%` }} /></div>
            <span>⭐ {xp} XP · <b>{rank.name}</b>{rank.next ? ` · ${rank.next[0] - xp} XP to ${rank.next[1]}` : " · top rank!"}</span></div>
        </div>
        <button type="button" className="btn ghost small" onClick={() => signOut()}>Sign out</button>
      </div>

      <div className="grid stats mt">
        {[["🎓", "Lessons completed", len(progress.lessons)], ["🚀", "Missions completed", `${missionDone} / 6`], ["★", "Mission stars", `${stars} / 18`],
          ["📚", "Saved words", len(progress.fav)], ["🔎", "Terms explored", len(progress.viewed)], ["🧭", "Careers explored", `${len(progress.careersSeen)} / 8`],
        ].map(([i, l, v]) => <div className="card stat" key={String(l)}><span className="stat-ico">{i}</span><b>{v}</b><small>{l}</small></div>)}
      </div>

      <div className="grid two mt">
        <div className="card">
          <div className="label">🔖 Saved lessons</div>
          {bookmarks.length ? <ul className="plain">{bookmarks.map((b) => <li key={b}><Link to="/academy">{b}</Link></li>)}</ul>
            : <p className="sub small">Tap 🔖 Save on any lesson in the <Link to="/academy">Academy</Link> or <Link to="/atc">ATC &amp; Comms</Link>.</p>}
          {match?.top && <><div className="label mt">🧭 Career match</div><p className="small">{match.top.map(([k, p]) => `${k} ${p}%`).join(" · ")} — <Link to="/careers">retake</Link></p></>}
        </div>
        <form className="card form" onSubmit={save}>
          <div className="label">Edit profile</div>
          <label>Display name<input name="displayName" defaultValue={user.displayName} maxLength={30} required /></label>
          <label>Goal<select name="goal" defaultValue={user.goal ?? GOALS[0]}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></label>
          <fieldset className="avatar-pick"><legend>Avatar</legend>
            {AVATARS.map((a) => <label key={a}><input type="radio" name="avatar" value={a} defaultChecked={a === user.avatar} /><span>{a}</span></label>)}
          </fieldset>
          {msg && <p className="ok">{msg}</p>}
          <button className="btn">Save profile</button>
        </form>
      </div>

      <div className="card mt">
        <div className="label">Your data</div>
        <p className="sub small">Signed in as {user.email}. Progress is stored in the AeroLearn database and synced to every device you sign in on.</p>
        <div className="row">
          <a className="btn ghost small" href="/api/me/export" download>⬇ Download my data (JSON)</a>
          {!confirmDelete && <button type="button" className="btn ghost small danger" onClick={() => setConfirmDelete(true)}>Delete account…</button>}
        </div>
        {confirmDelete && (
          <form className="form danger-zone" onSubmit={del}>
            <p><b>This permanently deletes your account and progress.</b> It can't be undone.</p>
            <label>Enter your password to confirm<input name="password" type="password" autoComplete="current-password" required /></label>
            <div className="row"><button type="button" className="btn ghost small" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="btn small danger">Delete my account</button></div>
          </form>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
