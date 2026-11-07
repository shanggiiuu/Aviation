import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loginSchema, profileUpdateSchema, registerSchema } from "@aerolearn/shared";
import { SESSION_COOKIE, createSession, destroySession, hashPassword, requireUser, setSessionCookie, userRow, verifyPassword } from "../auth.js";

const strict = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = await hashPassword("not-a-real-password");

export const authRoutes: FastifyPluginAsync = async (app) => {
  const db = app.db;

  app.post("/auth/register", strict, async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const exists = await db.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
    if (exists.rowCount) return reply.code(409).send({ error: "An account with that email already exists." });
    const { rows } = await db.query(
      "INSERT INTO users(email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *",
      [input.email, await hashPassword(input.password), input.displayName]);
    await db.query("INSERT INTO progress(user_id) VALUES ($1)", [rows[0].id]);
    setSessionCookie(reply, await createSession(db, rows[0].id));
    return reply.code(201).send({ user: userRow(rows[0]) });
  });

  app.post("/auth/login", strict, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [input.email]);
    const ok = await verifyPassword(input.password, rows[0]?.password_hash ?? DUMMY_HASH);
    if (!rows[0] || !ok) return reply.code(401).send({ error: "Email or password is incorrect." });
    setSessionCookie(reply, await createSession(db, rows[0].id));
    return { user: userRow(rows[0]) };
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await destroySession(db, token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", async (req) => ({ user: req.user }));

  app.patch("/me", { preHandler: requireUser }, async (req) => {
    const u = profileUpdateSchema.parse(req.body);
    const { rows } = await db.query(
      `UPDATE users SET display_name = COALESCE($2, display_name), avatar = COALESCE($3, avatar), goal = COALESCE($4, goal)
       WHERE id = $1 RETURNING *`, [req.user!.id, u.displayName ?? null, u.avatar ?? null, u.goal ?? null]);
    return { user: userRow(rows[0]) };
  });

  // Everything we store about the user, as JSON.
  app.get("/me/export", { preHandler: requireUser }, async (req, reply) => {
    const id = req.user!.id;
    const [progress, posts, replies] = await Promise.all([
      db.query("SELECT data, updated_at FROM progress WHERE user_id = $1", [id]),
      db.query("SELECT id, tag, title, body, created_at FROM posts WHERE author_id = $1 ORDER BY created_at", [id]),
      db.query("SELECT id, post_id, body, created_at FROM replies WHERE author_id = $1 ORDER BY created_at", [id]),
    ]);
    reply.header("Content-Disposition", 'attachment; filename="aerolearn-export.json"');
    return { exportedAt: new Date().toISOString(), user: req.user, progress: progress.rows[0] ?? null, posts: posts.rows, replies: replies.rows };
  });

  app.delete("/me", { preHandler: requireUser, ...strict }, async (req, reply) => {
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body);
    const { rows } = await db.query("SELECT password_hash FROM users WHERE id = $1", [req.user!.id]);
    if (!(await verifyPassword(password, rows[0].password_hash))) return reply.code(401).send({ error: "Password is incorrect." });
    await db.query("DELETE FROM users WHERE id = $1", [req.user!.id]); // cascades to sessions, progress, posts, replies, votes
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });
};
