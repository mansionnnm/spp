# TuneConvert
Next.js 14 + Tailwind + Zod + FFmpeg. Look up Spotify/SoundCloud links; convert your own uploaded audio to MP3/WAV/M4A/MP4.

## Run
1. Install Node 18+ and FFmpeg (`brew install ffmpeg` / `apt install ffmpeg`; the title-card style needs a build with libfreetype).
2. `cp .env.example .env.local`
3. `npm install && npm run dev` → http://localhost:3000

## What works now (no credentials)
- Link validation and platform detection (Spotify track/album, SoundCloud track/playlist).
- Title, artwork and (SoundCloud) author via each platform's public oEmbed endpoint.
- Upload → MP3/WAV/M4A/MP4 (cover art, audio bars, title card) with FFmpeg, temporary download, 30-min expiry, rate limiting, size limits.

## Needs more work
- Spotify artist/duration: add the Web API client-credentials flow in `app/api/analyse/route.ts` using `SPOTIFY_CLIENT_ID/SECRET` (server-side only).
- Platform downloads: not offered. Neither service provides audio files via public APIs; a SoundCloud "downloadable" check could be added with their API if you register an app.
- Vercel: serverless limits (execution time, body size, no FFmpeg binary, ephemeral disk) mean heavy conversion belongs on a separate worker, with S3/R2 storage and a Redis rate limiter.
- Progress is indeterminate by design; real percentages would need a job queue parsing FFmpeg `-progress` output.
