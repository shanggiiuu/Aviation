// Live METAR weather from the public aviationweather.gov Data API (no key needed).
// Results are cached for 5 minutes so we stay well within the provider's usage limits.
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { flightCategory, icaoListSchema, type LiveMetar } from "@aerolearn/shared";

const SOURCE = "https://aviationweather.gov/api/data/metar";
const TTL_MS = 5 * 60 * 1000;
const query = z.object({ ids: icaoListSchema });

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : null);

export function normalizeMetar(m: Record<string, any>): LiveMetar {
  const clouds = Array.isArray(m.clouds) ? m.clouds.map((c: any) => ({ cover: String(c.cover ?? ""), baseFt: num(c.base) })) : [];
  const ceiling = clouds.filter((c) => ["BKN", "OVC", "OVX", "VV"].includes(c.cover) && c.baseFt !== null).reduce<number | null>((lo, c) => (lo === null || c.baseFt! < lo ? c.baseFt : lo), null);
  const visRaw = m.visib ?? null;
  const visSm = typeof visRaw === "string" && visRaw.endsWith("+") ? num(visRaw.slice(0, -1)) : num(visRaw);
  const obs = num(m.obsTime);
  return {
    icao: String(m.icaoId ?? ""), name: m.name ?? null, raw: String(m.rawOb ?? ""),
    observed: obs ? new Date(obs * 1000).toISOString() : m.reportTime ? new Date(m.reportTime).toISOString() : null,
    windDir: m.wdir === "VRB" ? "VRB" : num(m.wdir), windKt: num(m.wspd), gustKt: num(m.wgst),
    visibility: visRaw === null ? null : `${visRaw} SM`, tempC: num(m.temp), dewpointC: num(m.dewp), altimeterHpa: num(m.altim),
    clouds, category: (["VFR", "MVFR", "IFR", "LIFR"].includes(m.fltCat) ? m.fltCat : flightCategory(ceiling, visSm)) as LiveMetar["category"],
  };
}

export const liveRoutes: FastifyPluginAsync<{ fetchImpl: typeof fetch }> = async (app, { fetchImpl }) => {
  const cache = new Map<string, { at: number; data: LiveMetar[] }>();

  app.get("/live/metar", async (req, reply) => {
    const { ids } = query.parse(req.query);
    const key = ids.split(",").sort().join(",");
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return { metars: hit.data, cached: true };
    let res: Response;
    try {
      res = await fetchImpl(`${SOURCE}?ids=${encodeURIComponent(key)}&format=json`, {
        headers: { "User-Agent": "AeroLearn/0.1 (educational aviation learning app)", Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return reply.code(502).send({ error: "The weather service didn't respond. Try again in a minute." });
    }
    if (res.status === 204) return { metars: [], cached: false };
    if (!res.ok) return reply.code(502).send({ error: `The weather service returned an error (${res.status}).` });
    const json = (await res.json().catch(() => [])) as unknown;
    const data = (Array.isArray(json) ? json : []).map(normalizeMetar);
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return { metars: data, cached: false };
  });
};
