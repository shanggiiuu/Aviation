export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** JSON fetch against our own API. Adds the CSRF header the server requires on every change. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["x-aerolearn"] = "1";
  let res: Response;
  try {
    res = await fetch("/api" + path, { method, headers, credentials: "same-origin", keepalive: opts.keepalive,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new ApiError("Can't reach the AeroLearn server. Check your connection.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? res.statusText, res.status);
  return data as T;
}

export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
