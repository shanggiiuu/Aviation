import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { buildApp } from "./app.js";
import { createDb } from "./db.js";
import { migrate } from "./migrate.js";

const db = createDb();
await migrate(db, (m) => console.log(`[migrate] ${m}`));
const app = await buildApp({ db, logger: true });

// In production the API also serves the built React app (apps/web/dist) from the same origin.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false });
  app.setNotFoundHandler((req, reply) =>
    req.method === "GET" && !req.url.startsWith("/api/") ? reply.sendFile("index.html") : reply.code(404).send({ error: "Not found" }));
}

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: process.env.HOST ?? "127.0.0.1" });

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => { app.close().then(() => db.end()).finally(() => process.exit(0)); });
