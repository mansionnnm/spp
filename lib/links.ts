import { z } from "zod";
export type Parsed = { platform: "spotify" | "soundcloud"; kind: "track" | "album" | "playlist"; url: string };
const SP = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album)\/[A-Za-z0-9]{22}(?:\?.*)?$/;
const SC = /^https:\/\/(?:www\.)?soundcloud\.com\/[\w-]+\/(sets\/)?[\w-]+(?:\?.*)?$/;
export const linkSchema = z.object({ url: z.string().trim().url().max(300) });
export function parseLink(raw: string): Parsed | null {
  const url = raw.trim();
  const sp = url.match(SP);
  if (sp) return { platform: "spotify", kind: sp[1] as "track" | "album", url };
  const sc = url.match(SC);
  if (sc) return { platform: "soundcloud", kind: sc[1] ? "playlist" : "track", url };
  return null;
}
