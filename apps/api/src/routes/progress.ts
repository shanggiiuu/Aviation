import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { mergeProgress, progressSchema, type Progress } from "@aerolearn/shared";
import { requireUser } from "../auth.js";

const body = z.object({ data: progressSchema });

export const progressRoutes: FastifyPluginAsync = async (app) => {
  const db = app.db;
  app.addHook("preHandler", requireUser);

  const load = async (userId: string) => {
    const { rows } = await db.query("SELECT data, updated_at FROM progress WHERE user_id = $1", [userId]);
    return { data: (rows[0]?.data ?? {}) as Progress, updatedAt: rows[0] ? new Date(rows[0].updated_at).toISOString() : null };
  };
  const save = async (userId: string, data: Progress) => {
    const { rows } = await db.query(
      `INSERT INTO progress(user_id, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING updated_at`, [userId, JSON.stringify(data)]);
    return { data, updatedAt: new Date(rows[0].updated_at).toISOString() };
  };

  app.get("/progress", async (req) => load(req.user!.id));

  // Replace: the browser's current snapshot becomes the saved one (used for normal autosave).
  app.put("/progress", async (req) => save(req.user!.id, body.parse(req.body).data));

  // Merge: combine this device's progress with the account's without losing either (used right after sign-in).
  app.post("/progress/merge", async (req) => {
    const incoming = body.parse(req.body).data;
    const current = await load(req.user!.id);
    return save(req.user!.id, mergeProgress(current.data, incoming));
  });
};
