import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@aerolearn/shared";
import type { Db } from "./db.js";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = "aero_sid";
export const SESSION_DAYS = 30;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, k] = stored.split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const expected = Buffer.from(k, "base64");
  const key = await scrypt(pw, Buffer.from(s, "base64"), expected.length, SCRYPT);
  return timingSafeEqual(key, expected);
}

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query("INSERT INTO sessions(id, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))", [tokenHash(token), userId, SESSION_DAYS]);
  return token;
}
export async function destroySession(db: Db, token: string) {
  await db.query("DELETE FROM sessions WHERE id = $1", [tokenHash(token)]);
}

export const userRow = (r: Record<string, any>): User => ({
  id: r.id, email: r.email, displayName: r.display_name, avatar: r.avatar, goal: r.goal ?? null,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function userForToken(db: Db, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const { rows } = await db.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.expires_at > now()`, [tokenHash(token)]);
  return rows[0] ? userRow(rows[0]) : null;
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86400,
  });
}

declare module "fastify" {
  interface FastifyRequest { user: User | null }
}

/** Use as a preHandler on routes that need a signed-in user. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "Please sign in first." });
}
