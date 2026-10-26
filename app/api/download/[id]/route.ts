import fs from "fs/promises";
import path from "path";
import { DIR } from "@/lib/store";
const TYPES: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", mp4: "video/mp4" };
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const q = new URL(req.url).searchParams, ext = q.get("f") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(params.id) || !TYPES[ext]) return new Response("Not found", { status: 404 });
  const name = (q.get("n") ?? `tuneconvert.${ext}`).replace(/[^\w .-]/g, "");
  try {
    const data = await fs.readFile(path.join(DIR, `${params.id}.${ext}`));
    return new Response(data, { headers: { "Content-Type": TYPES[ext], "Content-Disposition": `attachment; filename="${name}"` } });
  } catch { return new Response("This file has expired. Convert it again.", { status: 410 }); }
}
