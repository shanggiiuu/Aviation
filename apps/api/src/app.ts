import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import type { Db } from "./db.js";
import { SESSION_COOKIE, userForToken } from "./auth.js";
import { authRoutes } from "./routes/auth.js";
import { progressRoutes } from "./routes/progress.js";
import { liveRoutes } from "./routes/live.js";

export interface AppOptions {
  db: Db;
  logger?: boolean;
  /** Injected so tests can fake the live-weather provider. */
  fetchImpl?: typeof fetch;
  rateLimit?: boolean;
}

export const CSRF_HEADER = "x-aerolearn";

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 512 * 1024, trustProxy: true });
  app.decorate("db", opts.db);
  app.decorateRequest("user", null);

  await app.register(cookie);
  if (opts.rateLimit !== false) await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  // Who is calling? (session cookie → user)
  app.addHook("onRequest", async (req) => {
    req.user = await userForToken(opts.db, req.cookies[SESSION_COOKIE]);
  });
  // CSRF: browsers can't add custom headers to cross-site form posts, so require one on every state change.
  app.addHook("onRequest", async (req, reply) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.url.startsWith("/api/") && req.headers[CSRF_HEADER] !== "1")
      return reply.code(403).send({ error: "Missing request header." });
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: err.issues[0]?.message ?? "Invalid input", issues: err.issues });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.code(status).send({ error: status >= 500 ? "Something went wrong on our side." : (err as Error).message });
  });

  app.get("/api/health", async () => {
    await opts.db.query("SELECT 1");
    return { ok: true };
  });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(progressRoutes, { prefix: "/api" });
  await app.register(liveRoutes, { prefix: "/api", fetchImpl: opts.fetchImpl ?? fetch });
  return app;
}

declare module "fastify" {
  interface FastifyInstance { db: Db }
}
