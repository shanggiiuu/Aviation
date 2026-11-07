import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";

function useAfterAuth() {
  const [params] = useSearchParams();
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate(), next = useAfterAuth();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    try { await login({ email: String(f.get("email")), password: String(f.get("password")) }); navigate(next, { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <section className="auth card narrow">
      <div className="label">Learning account</div>
      <h2>Sign in</h2>
      <p className="sub">Your XP, lessons, missions and saved words follow you to any device.</p>
      <form onSubmit={submit} className="form">
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="sub small">New here? <Link to={`/register${next !== "/profile" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
    </section>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate(), next = useAfterAuth();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError("");
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) { setError("The two passwords don't match."); return; }
    setBusy(true);
    try {
      await register({ email: String(f.get("email")), password: String(f.get("password")), displayName: String(f.get("displayName")) });
      navigate(next, { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <section className="auth card narrow">
      <div className="label">Learning account</div>
      <h2>Create your account</h2>
      <p className="sub">Any progress you already made on this device is added to your new account automatically.</p>
      <form onSubmit={submit} className="form">
        <label>Display name<input name="displayName" maxLength={30} required autoComplete="nickname" /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label>Confirm password<input name="confirm" type="password" minLength={8} autoComplete="new-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="sub small">Already have one? <Link to="/login">Sign in</Link></p>
    </section>
  );
}
