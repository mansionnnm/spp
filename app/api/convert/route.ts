import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { DIR, MAX_BYTES, cleanup, limited } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;
const opts = z.object({
  format: z.enum(["mp3", "wav", "m4a", "mp4"]),
  style: z.enum(["cover", "bars", "title"]).default("cover"),
  title: z.string().max(120).default(""), artist: z.string().max(120).default(""),
});

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(process.env.FFMPEG_PATH ?? "ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
    let err = ""; p.stderr.on("data", (d) => (err += d));
    const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("Conversion timed out")); }, 110_000);
    p.on("error", () => { clearTimeout(t); reject(new Error("FFMPEG_MISSING")); });
    p.on("close", (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(err.slice(-400) || "ffmpeg failed")); });
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Rate limit reached. Try again in a few minutes." }, { status: 429 });
  await cleanup();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const o = opts.safeParse(Object.fromEntries(form ?? []));
  if (!(file instanceof File) || !o.success) return NextResponse.json({ error: "Choose an audio file and an output format." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `File is larger than ${MAX_BYTES / 1048576} MB.` }, { status: 413 });
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(file.name))
    return NextResponse.json({ error: "That file doesn't look like audio." }, { status: 415 });

  const id = crypto.randomUUID(), { format, style, title, artist } = o.data;
  const inPath = path.join(DIR, `${id}.src`), out = path.join(DIR, `${id}.${format}`);
  const art = form?.get("art");
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(inPath, Buffer.from(await file.arrayBuffer()));
    const size = "1280:720";
    if (format === "mp3") await run(["-i", inPath, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", out]);
    else if (format === "wav") await run(["-i", inPath, "-vn", "-c:a", "pcm_s16le", out]);
    else if (format === "m4a") await run(["-i", inPath, "-vn", "-c:a", "aac", "-b:a", "192k", out]);
    else if (style === "bars")
      await run(["-i", inPath, "-filter_complex", "[0:a]showfreqs=s=1280x720:mode=bar:fscale=log:colors=0x8b5cf6|0x22d3ee,format=yuv420p[v]", "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-c:a", "aac", "-shortest", out]);
    else if (style === "cover" && art instanceof File && art.size > 0) {
      const artPath = path.join(DIR, `${id}.art`);
      await fs.writeFile(artPath, Buffer.from(await art.arrayBuffer()));
      await run(["-loop", "1", "-i", artPath, "-i", inPath, "-vf", `scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`, "-c:v", "libx264", "-tune", "stillimage", "-r", "2", "-c:a", "aac", "-shortest", out]);
    } else {
      const txt = path.join(DIR, `${id}.txt`);
      await fs.writeFile(txt, [title, artist].filter(Boolean).join("\n") || file.name);
      await run(["-f", "lavfi", "-i", "color=c=0x0b0b1a:s=1280x720:r=2", "-i", inPath, "-vf", `drawtext=textfile=${txt}:fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p`, "-c:v", "libx264", "-c:a", "aac", "-shortest", out]);
    }
    return NextResponse.json({ id, format, name: `${(title || file.name.replace(/\.[^.]+$/, "")).replace(/[^\w .-]/g, "")}.${format}`, expiresInMin: Number(process.env.FILE_TTL_MINUTES ?? 30) });
  } catch (e) {
    console.error("[convert]", e);
    const missing = (e as Error).message === "FFMPEG_MISSING";
    return NextResponse.json({ error: missing ? "FFmpeg isn't installed on the server. Install it or set FFMPEG_PATH (see README)." : "Conversion failed. The file may be corrupt or unsupported." }, { status: 500 });
  } finally {
    await Promise.all(["src", "art", "txt"].map((x) => fs.rm(path.join(DIR, `${id}.${x}`), { force: true })));
  }
}
