import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, CSRF_HEADER } from "../src/app.js";
import { createDb, type Db } from "../src/db.js";
import { migrate } from "../src/migrate.js";

try { process.loadEnvFile(new URL("../../../.env", import.meta.url)); } catch { /* CI provides env vars directly */ }

let db: Db, app: FastifyInstance;
let weatherCalls = 0;
const fakeFetch = (async (url: string) => {
  weatherCalls++;
  if (String(url).includes("XXXX")) return new Response(null, { status: 204 });
  return new Response(JSON.stringify([{ icaoId: "RPLL", name: "Manila/Ninoy Aquino Intl", rawOb: "RPLL 071200Z 27012KT 9999 FEW020 BKN080 31/24 Q1008",
    obsTime: 1794052800, wdir: 270, wspd: 12, visib: "6+", temp: 31, dewp: 24, altim: 1008, clouds: [{ cover: "FEW", base: 2000 }, { cover: "BKN", base: 800 }] }]),
    { status: 200, headers: { "Content-Type": "application/json" } });
}) as unknown as typeof fetch;

beforeAll(async () => {
  db = createDb(process.env.TEST_DATABASE_URL);
  await migrate(db, () => {});
  app = await buildApp({ db, fetchImpl: fakeFetch, rateLimit: false });
});
afterAll(async () => { await app.close(); await db.end(); });
beforeEach(async () => { await db.query("TRUNCATE users, sessions, progress, posts, replies, post_votes CASCADE"); });

const H = { [CSRF_HEADER]: "1" };
async function signUp(email = "pilot@example.test", displayName = "Test Pilot") {
  const res = await app.inject({ method: "POST", url: "/api/auth/register", headers: H, payload: { email, password: "correct horse 1", displayName } });
  expect(res.statusCode).toBe(201);
  const c = res.cookies.find((x) => x.name === "aero_sid")!;
  return { cookie: `aero_sid=${c.value}`, user: res.json().user };
}

describe("accounts", () => {
  it("registers, reads the session, logs out", async () => {
    const { cookie, user } = await signUp();
    expect(user.displayName).toBe("Test Pilot");
    const me = await app.inject({ url: "/api/auth/me", headers: { cookie } });
    expect(me.json().user.email).toBe("pilot@example.test");
    await app.inject({ method: "POST", url: "/api/auth/logout", headers: { ...H, cookie } });
    const after = await app.inject({ url: "/api/auth/me", headers: { cookie } });
    expect(after.json().user).toBeNull();
  });
  it("rejects duplicate emails and wrong passwords, accepts the right one", async () => {
    await signUp();
    const dup = await app.inject({ method: "POST", url: "/api/auth/register", headers: H, payload: { email: "PILOT@example.test", password: "another pass", displayName: "X" } });
    expect(dup.statusCode).toBe(409);
    const bad = await app.inject({ method: "POST", url: "/api/auth/login", headers: H, payload: { email: "pilot@example.test", password: "nope nope" } });
    expect(bad.statusCode).toBe(401);
    const good = await app.inject({ method: "POST", url: "/api/auth/login", headers: H, payload: { email: "pilot@example.test", password: "correct horse 1" } });
    expect(good.statusCode).toBe(200);
  });
  it("stores only a password hash", async () => {
    await signUp();
    const { rows } = await db.query("SELECT password_hash FROM users");
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(rows[0].password_hash).not.toContain("correct horse");
  });
  it("requires the CSRF header on state changes", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/register", payload: { email: "a@b.test", password: "12345678", displayName: "A" } });
    expect(res.statusCode).toBe(403);
  });
  it("updates the profile and deletes the account with its data", async () => {
    const { cookie } = await signUp();
    const upd = await app.inject({ method: "PATCH", url: "/api/me", headers: { ...H, cookie }, payload: { avatar: "🚁", goal: "Student pilot" } });
    expect(upd.json().user.avatar).toBe("🚁");
    const wrong = await app.inject({ method: "DELETE", url: "/api/me", headers: { ...H, cookie }, payload: { password: "nope" } });
    expect(wrong.statusCode).toBe(401);
    const del = await app.inject({ method: "DELETE", url: "/api/me", headers: { ...H, cookie }, payload: { password: "correct horse 1" } });
    expect(del.statusCode).toBe(200);
    expect((await db.query("SELECT count(*)::int n FROM users")).rows[0].n).toBe(0);
  });
});

describe("progress", () => {
  it("needs a session", async () => {
    expect((await app.inject({ url: "/api/progress" })).statusCode).toBe(401);
  });
  it("merges device progress without losing anything, and replace keeps removals", async () => {
    const { cookie } = await signUp();
    await app.inject({ method: "PUT", url: "/api/progress", headers: { ...H, cookie }, payload: { data: { xp: 120, lessons: ["A"], missions: { "001": { stars: 3, best: 6 } } } } });
    const merged = await app.inject({ method: "POST", url: "/api/progress/merge", headers: { ...H, cookie },
      payload: { data: { xp: 40, lessons: ["B"], missions: { "001": { stars: 1, best: 3 }, "002": { stars: 2, best: 5 } }, notAKey: 1 } } });
    const d = merged.json().data;
    expect(d.xp).toBe(120);
    expect(d.lessons.sort()).toEqual(["A", "B"]);
    expect(d.missions["001"].stars).toBe(3);
    expect(d.missions["002"].stars).toBe(2);
    expect(d.notAKey).toBeUndefined();
    await app.inject({ method: "PUT", url: "/api/progress", headers: { ...H, cookie }, payload: { data: { ...d, lessons: ["A"] } } });
    expect((await app.inject({ url: "/api/progress", headers: { cookie } })).json().data.lessons).toEqual(["A"]);
  });
});

describe("live weather", () => {
  it("normalises, computes flight category, and caches", async () => {
    weatherCalls = 0;
    const r1 = (await app.inject({ url: "/api/live/metar?ids=rpll" })).json();
    expect(r1.metars[0]).toMatchObject({ icao: "RPLL", windDir: 270, windKt: 12, tempC: 31, category: "IFR" });
    const r2 = (await app.inject({ url: "/api/live/metar?ids=RPLL" })).json();
    expect(r2.cached).toBe(true);
    expect(weatherCalls).toBe(1);
  });
  it("validates ICAO codes and handles no data", async () => {
    expect((await app.inject({ url: "/api/live/metar?ids=../etc" })).statusCode).toBe(400);
    expect((await app.inject({ url: "/api/live/metar?ids=XXXX" })).json().metars).toEqual([]);
  });
});
