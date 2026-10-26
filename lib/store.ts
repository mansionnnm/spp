import fs from "fs/promises";
import os from "os";
import path from "path";
export const DIR = path.join(os.tmpdir(), "tuneconvert");
export const TTL = Number(process.env.FILE_TTL_MINUTES ?? 30) * 60_000;
export const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;
const hits = new Map<string, number[]>();
/** In-memory limiter (per instance). Swap for Redis/Upstash on serverless. */
export function limited(ip: string, max = 10, windowMs = 600_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now); hits.set(ip, recent);
  return recent.length > max;
}
export async function cleanup() {
  await fs.mkdir(DIR, { recursive: true });
  for (const f of await fs.readdir(DIR)) {
    const p = path.join(DIR, f);
    const s = await fs.stat(p).catch(() => null);
    if (s && Date.now() - s.mtimeMs > TTL) await fs.rm(p, { force: true });
  }
}
