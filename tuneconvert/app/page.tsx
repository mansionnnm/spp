"use client";
import { useState } from "react";
import { ClipboardPaste, X, Upload, Music2, Download, AlertCircle, ExternalLink, FileAudio } from "lucide-react";

type Track = { platform: "spotify" | "soundcloud"; kind: string; title: string; artist: string | null; thumbnail: string | null; sourceUrl: string; downloadable: boolean; reason: string };
type Done = { id: string; format: string; name: string; expiresInMin: number };
const FORMATS = [["mp3", "MP3", "Compressed, plays anywhere"], ["wav", "WAV", "Uncompressed, large"], ["m4a", "M4A", "AAC for Apple devices"], ["mp4", "MP4", "Video with artwork or visuals"]] as const;
const STYLES = [["cover", "Cover art"], ["bars", "Audio bars"], ["title", "Title card"]] as const;
const card = "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 sm:p-6";

export default function Home() {
  const [url, setUrl] = useState(""), [busy, setBusy] = useState<"" | "analyse" | "convert">(""), [err, setErr] = useState("");
  const [track, setTrack] = useState<Track | null>(null), [file, setFile] = useState<File | null>(null), [art, setArt] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("mp3"), [style, setStyle] = useState<string>("cover"), [done, setDone] = useState<Done | null>(null);

  const reset = () => { setUrl(""); setTrack(null); setErr(""); setDone(null); setFile(null); setArt(null); };
  async function analyse() {
    setErr(""); setTrack(null); setBusy("analyse");
    try {
      const r = await fetch("/api/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error); setTrack(j);
    } catch (e) { setErr((e as Error).message || "Something went wrong."); } finally { setBusy(""); }
  }
  async function convert() {
    if (!file) return; setErr(""); setDone(null); setBusy("convert");
    const fd = new FormData(); fd.set("file", file); fd.set("format", format); fd.set("style", style);
    fd.set("title", track?.title ?? ""); fd.set("artist", track?.artist ?? ""); if (art) fd.set("art", art);
    try {
      const r = await fetch("/api/convert", { method: "POST", body: fd });
      const j = await r.json(); if (!r.ok) throw new Error(j.error); setDone(j);
    } catch (e) { setErr((e as Error).message || "Conversion failed."); } finally { setBusy(""); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10 flex items-center gap-3">
        <span className="eq" aria-hidden>{[0, .3, .15, .5, .1].map((d, i) => <i key={i} style={{ animationDelay: `${d}s` }} />)}</span>
        <span className="text-xl font-semibold tracking-tight">TuneConvert</span>
      </header>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">Your music.<br />Your format.</h1>
      <p className="mt-5 max-w-xl text-lg text-white/60">Look up a Spotify or SoundCloud link, then convert audio you own into MP3, WAV, M4A or a video. We never pull audio from streaming services.</p>

      <section className={`${card} mt-10`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && url && analyse()} aria-label="Track link"
              placeholder="Paste a Spotify or SoundCloud link..." className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 pl-4 pr-20 text-base outline-none focus:border-cyan-400/70 focus-visible:ring-2 focus-visible:ring-cyan-400/40" />
            <div className="absolute right-2 top-2 flex gap-1">
              {url ? <button onClick={reset} aria-label="Clear link" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"><X size={18} /></button>
                : <button onClick={async () => setUrl(await navigator.clipboard.readText().catch(() => ""))} aria-label="Paste from clipboard" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"><ClipboardPaste size={18} /></button>}
            </div>
          </div>
          <button onClick={analyse} disabled={!url || busy !== ""} className="h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 font-semibold text-black transition disabled:opacity-40 hover:brightness-110">Analyse link</button>
        </div>
        <div className="mt-4 flex gap-2 text-sm text-white/60">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">Spotify</span>
          <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-orange-300">SoundCloud</span>
        </div>
        {busy === "analyse" && <Bar label="Reading link…" />}
        {track && (
          <div className="mt-5 flex gap-4 rounded-2xl bg-black/30 p-4">
            {track.thumbnail ? <img src={track.thumbnail} alt="" className="h-24 w-24 rounded-xl object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-white/5"><Music2 /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-medium">{track.title}</p>
              <p className="truncate text-white/60">{track.artist ?? "Artist shown on the platform"}</p>
              <p className="mt-2 text-sm text-amber-300">Export unavailable. {track.reason}</p>
              <a href={track.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline">Listen on {track.platform === "spotify" ? "Spotify" : "SoundCloud"} <ExternalLink size={14} /></a>
            </div>
          </div>
        )}
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-2xl font-semibold">Convert your own audio</h2>
        <p className="mt-1 text-white/60">Upload a file you have the rights to. Up to 50 MB. Files are deleted after 30 minutes.</p>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/20 p-5 hover:border-violet-400/60 focus-within:ring-2 focus-within:ring-cyan-400/40">
          {file ? <FileAudio className="text-cyan-300" /> : <Upload />}<span className="truncate">{file ? file.name : "Choose an audio file"}</span>
          <input type="file" accept="audio/*,.m4a,.flac,.opus" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDone(null); }} />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Output format">
          {FORMATS.map(([k, n, d]) => (
            <button key={k} role="radio" aria-checked={format === k} onClick={() => setFormat(k)}
              className={`rounded-2xl border p-4 text-left transition ${format === k ? "border-violet-400 bg-violet-500/15" : "border-white/10 hover:bg-white/5"}`}>
              <span className="block font-semibold">{n}</span><span className="text-xs text-white/50">{d}</span>
            </button>
          ))}
        </div>
        {format === "mp4" && (
          <div className="mt-4 rounded-2xl bg-black/30 p-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Video style">
              {STYLES.map(([k, n]) => <button key={k} role="radio" aria-checked={style === k} onClick={() => setStyle(k)} className={`rounded-full border px-4 py-1.5 text-sm ${style === k ? "border-cyan-300 bg-cyan-400/15" : "border-white/15"}`}>{n}</button>)}
            </div>
            {style === "cover" && <label className="mt-3 block text-sm text-white/60">Cover image (optional, otherwise a title card is used)
              <input type="file" accept="image/*" onChange={(e) => setArt(e.target.files?.[0] ?? null)} className="mt-1 block text-white/80" /></label>}
          </div>
        )}
        <button onClick={convert} disabled={!file || busy !== ""} className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 font-semibold text-black disabled:opacity-40 hover:brightness-110">Convert to {format.toUpperCase()}</button>
        {busy === "convert" && <Bar label="Converting with FFmpeg. This can take a minute…" />}
        {done && (
          <a href={`/api/download/${done.id}?f=${done.format}&n=${encodeURIComponent(done.name)}`} className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 py-3 font-medium text-emerald-300 hover:bg-emerald-400/20">
            <Download size={18} /> Download {done.name} <span className="text-xs text-emerald-300/60">(expires in {done.expiresInMin} min)</span>
          </a>
        )}
      </section>

      {err && <div role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200"><AlertCircle size={18} className="mt-0.5 shrink-0" />{err}</div>}
      <footer className="mt-14 border-t border-white/10 pt-6 text-sm text-white/45">
        Only convert audio you own or are licensed to use. TuneConvert isn't affiliated with Spotify or SoundCloud and doesn't bypass DRM or download restrictions. Uploads are processed in temporary storage and deleted automatically; no accounts, no tracking. Use is subject to the terms of your hosting operator and the rights of copyright holders.
      </footer>
    </main>
  );
}
function Bar({ label }: { label: string }) {
  return <div className="mt-4" role="status"><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div><p className="mt-2 text-sm text-white/50">{label}</p></div>;
}
