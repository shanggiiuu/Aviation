import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { POST_TAGS, postSchema, replySchema, type PostDetail, type PostSummary, type Reply } from "@aerolearn/shared";
import { requireUser } from "../auth.js";

const idParam = z.object({ id: z.string().uuid("Not found") });
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.enum(POST_TAGS).optional(),
  sort: z.enum(["new", "top", "open"]).default("new"),
});
const ORDER = { new: "p.created_at DESC", top: "votes DESC, p.created_at DESC", open: "(reply_count = 0) DESC, p.created_at DESC" } as const;

const SUMMARY_SQL = `
  SELECT p.id, p.tag, p.title, p.body, p.created_at, p.author_id, u.display_name, u.avatar,
    (SELECT count(*) FROM post_votes v WHERE v.post_id = p.id)::int AS votes,
    (SELECT count(*) FROM replies r WHERE r.post_id = p.id)::int AS reply_count,
    EXISTS (SELECT 1 FROM post_votes v WHERE v.post_id = p.id AND v.user_id = $1::uuid) AS voted
  FROM posts p JOIN users u ON u.id = p.author_id`;

const summary = (r: Record<string, any>, me: string | null): PostSummary => ({
  id: r.id, tag: r.tag, title: r.title, body: r.body, createdAt: new Date(r.created_at).toISOString(),
  author: { id: r.author_id, displayName: r.display_name, avatar: r.avatar },
  votes: r.votes, replyCount: r.reply_count, votedByMe: r.voted, mine: r.author_id === me,
});
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
const posting = { preHandler: requireUser, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const communityRoutes: FastifyPluginAsync = async (app) => {
  const db = app.db;
  const getSummary = async (id: string, me: string | null) => {
    const { rows } = await db.query(`${SUMMARY_SQL} WHERE p.id = $2`, [me, id]);
    return rows[0] ? summary(rows[0], me) : null;
  };

  app.get("/posts", async (req) => {
    const q = listQuery.parse(req.query), me = req.user?.id ?? null;
    const { rows } = await db.query(
      `SELECT * FROM (${SUMMARY_SQL}
         WHERE ($2::text IS NULL OR p.tag = $2) AND ($3::text IS NULL OR p.title ILIKE $3 OR p.body ILIKE $3)) p
       ORDER BY ${ORDER[q.sort]} LIMIT 100`,
      [me, q.tag ?? null, q.q ? `%${likeEscape(q.q)}%` : null]);
    return { posts: rows.map((r) => summary(r, me)) };
  });

  app.post("/posts", posting, async (req, reply) => {
    const p = postSchema.parse(req.body);
    const { rows } = await db.query("INSERT INTO posts(author_id, tag, title, body) VALUES ($1, $2, $3, $4) RETURNING id", [req.user!.id, p.tag, p.title, p.body]);
    return reply.code(201).send({ post: await getSummary(rows[0].id, req.user!.id) });
  });

  app.get("/posts/:id", async (req, reply) => {
    const { id } = idParam.parse(req.params), me = req.user?.id ?? null;
    const post = await getSummary(id, me);
    if (!post) return reply.code(404).send({ error: "That discussion doesn't exist (any more)." });
    const { rows } = await db.query(
      `SELECT r.id, r.body, r.created_at, r.author_id, u.display_name, u.avatar FROM replies r JOIN users u ON u.id = r.author_id
       WHERE r.post_id = $1 ORDER BY r.created_at`, [id]);
    const replies: Reply[] = rows.map((r) => ({ id: r.id, body: r.body, createdAt: new Date(r.created_at).toISOString(),
      author: { id: r.author_id, displayName: r.display_name, avatar: r.avatar }, mine: r.author_id === me }));
    return { post: { ...post, replies } satisfies PostDetail };
  });

  app.delete("/posts/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await db.query("DELETE FROM posts WHERE id = $1 AND author_id = $2", [id, req.user!.id]);
    if (!r.rowCount) return reply.code(404).send({ error: "Not found, or not yours to delete." });
    return { ok: true };
  });

  app.post("/posts/:id/replies", posting, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { body } = replySchema.parse(req.body);
    const exists = await db.query("SELECT 1 FROM posts WHERE id = $1", [id]);
    if (!exists.rowCount) return reply.code(404).send({ error: "That discussion doesn't exist (any more)." });
    const { rows } = await db.query("INSERT INTO replies(post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, created_at", [id, req.user!.id, body]);
    const u = req.user!;
    return reply.code(201).send({ reply: { id: rows[0].id, body, createdAt: new Date(rows[0].created_at).toISOString(),
      author: { id: u.id, displayName: u.displayName, avatar: u.avatar }, mine: true } satisfies Reply });
  });

  app.delete("/replies/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await db.query("DELETE FROM replies WHERE id = $1 AND author_id = $2", [id, req.user!.id]);
    if (!r.rowCount) return reply.code(404).send({ error: "Not found, or not yours to delete." });
    return { ok: true };
  });

  // Toggle my vote on a post.
  app.put("/posts/:id/vote", { preHandler: requireUser }, async (req, reply) => {
    const { id } = idParam.parse(req.params), me = req.user!.id;
    const exists = await db.query("SELECT 1 FROM posts WHERE id = $1", [id]);
    if (!exists.rowCount) return reply.code(404).send({ error: "Not found." });
    const del = await db.query("DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2", [id, me]);
    if (!del.rowCount) await db.query("INSERT INTO post_votes(post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, me]);
    const post = await getSummary(id, me);
    return { votes: post!.votes, votedByMe: post!.votedByMe };
  });
};
