import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { APP_NAME, POWERED_BY_PANTA } from "./config";

// Share cards rendered with next/og (Satori). Story cards are 1080×1920 with
// ~250px clear at the top and ~340px at the bottom for Instagram/WhatsApp UI.
// Every card prints the QR code and short link, because links in Status and
// Story images are not tappable without a sticker.
//
// Visual language (docs/DESIGN.md): pure black canvas, white type, and color
// only for YES (mint) and NO (pink). Satori lays out with flexbox only, so every
// element with more than one child sets display:flex.

export type CardFormat = "story" | "og" | "square" | "cover";
export type CardKind = "market" | "pick" | "win";

export type CardData = {
  question: string;
  creatorHandle: string;
  creatorName: string | null;
  avatarUrl: string | null;
  kind: "panta" | "forecast";
  yes: number | null;
  callsYes?: number;
  callsNo?: number;
  creatorCall: "yes" | "no" | null;
  closesAt: number | null;
  outcome: "yes" | "no" | "void" | null;
  url: string; // link printed and encoded in the QR
  shortUrl: string; // human-readable version
  asOf: number;
  pickSide?: "yes" | "no";
};

// Mirrors the tokens in src/app/globals.css.
const C = {
  canvas: "#000000",
  card: "#16161A",
  hairline: "#26262B",
  fg: "#FFFFFF",
  fg2: "#A1A1AA",
  fg3: "#6B6B74",
  yes: "#22E39B",
  no: "#FF4F70",
  accent: "#8B5CF6",
  accent2: "#F472B6",
};

const SIDE_COLOR = { yes: C.yes, no: C.no } as const;

const SIZES: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  cover: { width: 1024, height: 1024 },
};

let fontCache: ArrayBuffer | null = null;
async function boldFont(): Promise<ArrayBuffer> {
  if (!fontCache) {
    const buf = await fs.readFile(path.join(process.cwd(), "assets", "fonts", "Inter-Bold.otf"));
    fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  return fontCache;
}

async function avatarDataUrl(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 1_500_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function pctText(p: number | null) {
  if (p === null) return "--";
  return `${Math.round(p * 100)}%`;
}

/** Short link font size: step down for long hosts/slugs so it stays on one or two lines. */
function linkSize(text: string, base: number) {
  return text.length > 34 ? Math.round(base * 0.8) : text.length > 24 ? Math.round(base * 0.9) : base;
}

function closesText(sec: number | null) {
  if (!sec) return "";
  const d = new Date(sec * 1000);
  return `Closes ${d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function asOfText(sec: number) {
  return `Odds as of ${new Date(sec * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

/** Avatar inside an Instagram-style story ring (accent → accent-2 gradient). `size` is the outer footprint. */
function Avatar({ src, handle, size }: { src: string | null; handle: string; size: number }) {
  const band = Math.max(3, Math.round(size * 0.045));
  const inner = size - band * 4;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        padding: band,
        flexShrink: 0,
        background: `linear-gradient(45deg, ${C.accent} 0%, ${C.accent2} 100%)`,
      }}
    >
      <div style={{ display: "flex", borderRadius: size, padding: band, background: C.canvas }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} width={inner} height={inner} style={{ width: inner, height: inner, borderRadius: inner, objectFit: "cover" }} alt="" />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: inner,
              height: inner,
              borderRadius: inner,
              background: C.card,
              color: C.fg,
              fontSize: Math.round(inner * 0.44),
            }}
          >
            {handle.replace(/^@/, "").slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
      </div>
    </div>
  );
}

/** Two-tone brand mark (YES bar stepping up, NO bar stepping down) with the "zan" wordmark. */
function Brand({ size, markOnly }: { size: number; markOnly?: boolean }) {
  const barW = Math.round(size * 0.3);
  const barH = Math.round(size * 0.7);
  const step = Math.round(size * 0.15);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.28), flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.14), height: size }}>
        <div style={{ display: "flex", width: barW, height: barH, borderRadius: barW, background: C.yes, marginTop: -step * 2 }} />
        <div style={{ display: "flex", width: barW, height: barH, borderRadius: barW, background: C.no, marginTop: step * 2 }} />
      </div>
      {markOnly ? null : <div style={{ display: "flex", fontSize: size, lineHeight: 1, letterSpacing: -size * 0.04, color: C.fg }}>{APP_NAME.toLowerCase()}</div>}
    </div>
  );
}

/** QR code on a white rounded tile so it scans from any background. */
function QrTile({ src, size, radius }: { src: string; size: number; radius: number }) {
  const pad = Math.round(size * 0.07);
  return (
    <div style={{ display: "flex", padding: pad, borderRadius: radius, background: "#FFFFFF", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={size} height={size} style={{ width: size, height: size }} alt="" />
    </div>
  );
}

/** Kalshi-style result rows: colored label, a track with the side's fill, and the % in white. */
function Bars({ d, scale }: { d: CardData; scale: number }) {
  const font = Math.round(40 * scale);
  const sp = Math.round(font * 0.3);
  if (d.kind === "forecast") {
    const total = (d.callsYes ?? 0) + (d.callsNo ?? 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * scale, width: "100%" }}>
        <div style={{ display: "flex", fontSize: Math.round(28 * scale), color: C.fg2 }}>Free call · no money</div>
        {total > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", fontSize: font, color: C.fg }}>
            <div style={{ display: "flex", marginRight: sp }}>{String(d.callsYes)}</div>
            <div style={{ display: "flex", marginRight: sp, color: C.yes }}>called YES</div>
            <div style={{ display: "flex", marginRight: sp, color: C.fg3 }}>·</div>
            <div style={{ display: "flex", marginRight: sp }}>{String(d.callsNo)}</div>
            <div style={{ display: "flex", color: C.no }}>called NO</div>
          </div>
        ) : null}
        {total > 0 ? (
          <div style={{ display: "flex", width: "100%", height: Math.round(16 * scale), gap: Math.round(6 * scale), marginTop: Math.round(6 * scale) }}>
            {d.callsYes ? <div style={{ display: "flex", flexGrow: d.callsYes, flexBasis: 0, borderRadius: 999, background: C.yes }} /> : null}
            {d.callsNo ? <div style={{ display: "flex", flexGrow: d.callsNo, flexBasis: 0, borderRadius: 999, background: C.no }} /> : null}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: font, color: C.fg }}>Be the first to call it</div>
        )}
      </div>
    );
  }
  const yes = d.yes;
  const no = yes === null ? null : 1 - yes;
  const barH = Math.round(22 * scale);
  const row = (label: string, p: number | null, color: string) => (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: Math.round(24 * scale) }}>
      <div style={{ display: "flex", width: Math.round(96 * scale), flexShrink: 0, fontSize: font, color: p === null ? C.fg3 : color, letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "flex", flexGrow: 1, height: barH, borderRadius: barH, background: C.card, overflow: "hidden" }}>
        {p === null ? null : <div style={{ display: "flex", height: barH, borderRadius: barH, width: `${Math.max(3, Math.round(p * 100))}%`, background: color }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", width: Math.round(120 * scale), flexShrink: 0, fontSize: font, color: p === null ? C.fg3 : C.fg }}>{pctText(p)}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: Math.round(22 * scale), width: "100%" }}>
      {row("YES", yes, C.yes)}
      {row("NO", no, C.no)}
    </div>
  );
}

/** The creator call line, with the side word in its color. Same wording as before, split for styling. */
function Headline({ d, size }: { d: CardData; size: number }) {
  // Satori ignores columnGap, so each segment carries its own right margin.
  const gap = Math.round(size * 0.27);
  const wrap = (children: ReactNode) => (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", fontSize: size, lineHeight: 1.2, color: C.fg2 }}>{children}</div>
  );
  const word = (text: string, color: string) => <div style={{ display: "flex", color, marginRight: gap }}>{text}</div>;
  if (d.outcome === "yes" || d.outcome === "no") return wrap(<>{word("Resolved", C.fg)}{word(d.outcome.toUpperCase(), SIDE_COLOR[d.outcome])}</>);
  if (d.pickSide)
    return wrap(
      <>
        {word("I'm backing", C.fg)}
        {word(d.pickSide.toUpperCase(), SIDE_COLOR[d.pickSide])}
        {word(`on @${d.creatorHandle}'s call`, C.fg)}
      </>,
    );
  if (d.creatorCall)
    return wrap(
      <>
        {word(`@${d.creatorHandle} says`, C.fg)}
        {word(`${d.creatorCall.toUpperCase()}.`, SIDE_COLOR[d.creatorCall])}
        {word("Back it or fade it.", C.fg2)}
      </>,
    );
  return wrap(word(`@${d.creatorHandle} made a call`, C.fg));
}

export async function renderCard(format: CardFormat, d: CardData): Promise<ImageResponse> {
  const { width, height } = SIZES[format];
  const [font, avatar, qr] = await Promise.all([
    boldFont(),
    avatarDataUrl(d.avatarUrl),
    format === "cover" ? Promise.resolve(null) : QRCode.toDataURL(d.url, { margin: 1, width: 360, color: { dark: "#000000", light: "#FFFFFF" } }),
  ]);
  const fonts = [{ name: "Inter", data: font, weight: 700 as const, style: "normal" as const }];
  const disclosure = d.kind === "panta" ? `#ad · @${d.creatorHandle} earns fees from trades on this market` : "Free call · no money · no prizes";
  const qLen = d.question.length;

  if (format === "story") {
    const qSize = qLen > 140 ? 56 : qLen > 90 ? 64 : qLen > 60 ? 76 : 88;
    return new ImageResponse(
      (
        <div style={{ width, height, display: "flex", flexDirection: "column", background: C.canvas, color: C.fg, fontFamily: "Inter", padding: "250px 80px 340px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28, flexShrink: 1, minWidth: 0 }}>
              <Avatar src={avatar} handle={d.creatorHandle} size={132} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 1, minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: 46, letterSpacing: -0.5 }}>{`@${d.creatorHandle}`}</div>
                <div style={{ display: "flex", fontSize: 30, color: C.fg2 }}>{d.creatorName ?? APP_NAME}</div>
              </div>
            </div>
            <Brand size={40} />
          </div>
          <div style={{ display: "flex", flexGrow: 1, minHeight: 64 }} />
          <div style={{ display: "flex" }}>
            <Headline d={d} size={40} />
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: qSize, lineHeight: 1.1, letterSpacing: -qSize * 0.025, overflow: "hidden", flexShrink: 1 }}>{d.question}</div>
          <div style={{ display: "flex", marginTop: 64 }}>
            <Bars d={d} scale={1.3} />
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 26, color: C.fg3 }}>
            {d.kind === "panta" ? `${asOfText(d.asOf)} · ${closesText(d.closesAt)}` : closesText(d.closesAt)}
          </div>
          <div style={{ display: "flex", flexGrow: 1, minHeight: 64 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 36, background: C.card, borderRadius: 44, padding: 32 }}>
            {qr ? <QrTile src={qr} size={212} radius={28} /> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 1, minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: 32, color: C.fg2 }}>Scan or visit</div>
              <div style={{ display: "flex", fontSize: linkSize(d.shortUrl, 40), color: C.fg, letterSpacing: -0.5, wordBreak: "break-word" }}>{d.shortUrl}</div>
              <div style={{ display: "flex", fontSize: 24, color: C.fg3, marginTop: 14 }}>{disclosure}</div>
              {d.kind === "panta" ? <div style={{ display: "flex", fontSize: 24, color: C.fg2 }}>{POWERED_BY_PANTA}</div> : null}
            </div>
          </div>
        </div>
      ),
      { width, height, fonts, headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } },
    );
  }

  if (format === "og") {
    return new ImageResponse(
      (
        <div style={{ width, height, display: "flex", background: C.canvas, color: C.fg, fontFamily: "Inter", padding: 56, gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, width: 740 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Avatar src={avatar} handle={d.creatorHandle} size={80} />
              <div style={{ display: "flex", flexShrink: 1, minWidth: 0 }}>
                <Headline d={d} size={30} />
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: qLen > 120 ? 38 : qLen > 80 ? 44 : 54, lineHeight: 1.1, letterSpacing: -1.2, overflow: "hidden", flexShrink: 1 }}>
              {d.question}
            </div>
            <div style={{ display: "flex", flexGrow: 1, minHeight: 20 }} />
            <Bars d={d} scale={0.78} />
            <div style={{ display: "flex", marginTop: 16, fontSize: 19, color: C.fg3 }}>
              {d.kind === "panta" ? `${asOfText(d.asOf)} · ${POWERED_BY_PANTA}` : "Free call · no money"}
            </div>
            {d.kind === "panta" ? <div style={{ display: "flex", marginTop: 4, fontSize: 19, color: C.fg3 }}>{disclosure}</div> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: 300, flexShrink: 0 }}>
            <Brand size={34} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {qr ? <QrTile src={qr} size={236} radius={24} /> : null}
              <div style={{ display: "flex", fontSize: linkSize(d.shortUrl, 24), color: C.fg, textAlign: "center", wordBreak: "break-word" }}>{d.shortUrl}</div>
            </div>
          </div>
        </div>
      ),
      { width, height, fonts, headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } },
    );
  }

  // square + cover
  const isCover = format === "cover";
  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: "column", background: C.canvas, color: C.fg, fontFamily: "Inter", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexShrink: 1, minWidth: 0 }}>
            <Avatar src={avatar} handle={d.creatorHandle} size={104} />
            <div style={{ display: "flex", fontSize: 40, letterSpacing: -0.5 }}>{`@${d.creatorHandle}`}</div>
          </div>
          {isCover ? null : <Brand size={36} />}
        </div>
        {isCover ? null : (
          <div style={{ display: "flex", marginTop: 40 }}>
            <Headline d={d} size={32} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: isCover ? 56 : 20,
            fontSize: qLen > 140 ? 50 : qLen > 80 ? 58 : 72,
            lineHeight: 1.08,
            letterSpacing: -1.6,
            overflow: "hidden",
            flexShrink: 1,
          }}
        >
          {d.question}
        </div>
        <div style={{ display: "flex", flexGrow: 1, minHeight: 32 }} />
        {isCover ? (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Brand size={40} markOnly />
            <div style={{ display: "flex", fontSize: 30, color: C.fg2 }}>{`${APP_NAME} · creator call`}</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, gap: 10 }}>
              <Bars d={d} scale={0.95} />
              <div style={{ display: "flex", marginTop: 18, fontSize: linkSize(d.shortUrl, 28), color: C.fg, wordBreak: "break-word" }}>{d.shortUrl}</div>
              <div style={{ display: "flex", fontSize: 21, color: C.fg3 }}>{disclosure}</div>
              {d.kind === "panta" ? <div style={{ display: "flex", fontSize: 21, color: C.fg2 }}>{POWERED_BY_PANTA}</div> : null}
            </div>
            {qr ? <QrTile src={qr} size={196} radius={24} /> : null}
          </div>
        )}
      </div>
    ),
    { width, height, fonts, headers: { "Cache-Control": isCover ? "public, max-age=86400" : "public, max-age=60, s-maxage=120" } },
  );
}
