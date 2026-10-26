import { NextResponse } from "next/server";
import { linkSchema, parseLink } from "@/lib/links";
import { limited } from "@/lib/store";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip, 30)) return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  const body = linkSchema.safeParse(await req.json().catch(() => null));
  const link = body.success ? parseLink(body.data.url) : null;
  if (!link) return NextResponse.json({ error: "That doesn't look like a Spotify track/album or SoundCloud track/playlist link." }, { status: 400 });

  const endpoint = link.platform === "spotify"
    ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`
    : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(link.url)}`;
  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (r.status === 404 || r.status === 403) return NextResponse.json({ error: "This link is private, removed, or unavailable." }, { status: 404 });
    if (!r.ok) throw new Error(`oEmbed ${r.status}`);
    const m = await r.json();
    return NextResponse.json({
      platform: link.platform, kind: link.kind, sourceUrl: link.url,
      title: m.title, artist: m.author_name ?? null, thumbnail: m.thumbnail_url ?? null, durationSec: null,
      // Honest availability: oEmbed and the public APIs never hand out audio files.
      downloadable: false,
      reason: link.platform === "spotify"
        ? "Spotify only permits streaming inside its apps; it doesn't provide downloadable audio files."
        : "SoundCloud only offers downloads when the uploader enables them, and TuneConvert doesn't bypass that.",
    });
  } catch (e) {
    console.error("[analyse]", e);
    return NextResponse.json({ error: "Couldn't reach the platform to read this link. Try again shortly." }, { status: 502 });
  }
}
