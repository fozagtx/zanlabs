import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { APP_NAME, POWERED_BY_PANTA } from "./config";

// Share cards rendered with next/og (Satori). Story cards are 1080×1920 with
// ~250px clear at the top and ~340px at the bottom for Instagram/WhatsApp UI.
// Every card prints the QR code and short link, because links in Status and
// Story images are not tappable without a sticker.

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

const C = {
  bg: "#160F24",
  bg2: "#2A1340",
  coral: "#FF6B5B",
  peach: "#FFB199",
  ink: "#FFF6F1",
  muted: "#C9B8D6",
  yes: "#2FD7A8",
  no: "#B79CFF",
  card: "rgba(255,255,255,0.08)",
};

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

function closesText(sec: number | null) {
  if (!sec) return "";
  const d = new Date(sec * 1000);
  return `Closes ${d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function asOfText(sec: number) {
  return `Odds as of ${new Date(sec * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function Avatar({ src, handle, size }: { src: string | null; handle: string; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} style={{ borderRadius: size, objectFit: "cover", border: `4px solid ${C.coral}` }} alt="" />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: C.coral,
        color: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
      }}
    >
      {handle.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Bars({ d, scale }: { d: CardData; scale: number }) {
  if (d.kind === "forecast") {
    const total = (d.callsYes ?? 0) + (d.callsNo ?? 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * scale, width: "100%" }}>
        <div style={{ display: "flex", fontSize: 30 * scale, color: C.muted }}>Free call · no money</div>
        <div style={{ display: "flex", fontSize: 40 * scale, color: C.ink }}>
          {total > 0 ? `${d.callsYes} called YES · ${d.callsNo} called NO` : "Be the first to call it"}
        </div>
      </div>
    );
  }
  const yes = d.yes;
  const no = yes === null ? null : 1 - yes;
  const row = (label: string, p: number | null, color: string) => (
    <div style={{ display: "flex", alignItems: "center", width: "100%", height: 76 * scale, borderRadius: 22 * scale, background: C.card, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(4, Math.round((p ?? 0) * 100))}%`, background: color, opacity: 0.85 }} />
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: `0 ${26 * scale}px`, fontSize: 38 * scale, color: C.ink }}>
        <span>{label}</span>
        <span>{pctText(p)}</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 * scale, width: "100%" }}>
      {row("YES", yes, C.yes)}
      {row("NO", no, C.no)}
    </div>
  );
}

function Headline({ d }: { d: CardData }) {
  if (d.outcome === "yes" || d.outcome === "no") return <>{`Resolved ${d.outcome.toUpperCase()}`}</>;
  if (d.pickSide) return <>{`I'm backing ${d.pickSide.toUpperCase()} on @${d.creatorHandle}'s call`}</>;
  if (d.creatorCall) return <>{`@${d.creatorHandle} says ${d.creatorCall.toUpperCase()}. Back it or fade it.`}</>;
  return <>{`@${d.creatorHandle} made a call`}</>;
}

export async function renderCard(format: CardFormat, d: CardData): Promise<ImageResponse> {
  const { width, height } = SIZES[format];
  const [font, avatar, qr] = await Promise.all([
    boldFont(),
    avatarDataUrl(d.avatarUrl),
    format === "cover" ? Promise.resolve(null) : QRCode.toDataURL(d.url, { margin: 1, width: 360, color: { dark: "#160F24", light: "#FFFFFF" } }),
  ]);
  const fonts = [{ name: "Inter", data: font, weight: 700 as const, style: "normal" as const }];
  const disclosure = d.kind === "panta" ? `#ad · @${d.creatorHandle} earns fees from trades on this market` : "Free call · no money · no prizes";
  const qLen = d.question.length;

  if (format === "story") {
    const qSize = qLen > 90 ? 64 : qLen > 60 ? 76 : 88;
    return new ImageResponse(
      (
        <div style={{ width, height, display: "flex", flexDirection: "column", background: `linear-gradient(160deg, ${C.bg2} 0%, ${C.bg} 55%, #0E0A17 100%)`, color: C.ink, fontFamily: "Inter", padding: "250px 80px 340px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Avatar src={avatar} handle={d.creatorHandle} size={120} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 46 }}>{`@${d.creatorHandle}`}</div>
              <div style={{ display: "flex", fontSize: 30, color: C.muted }}>{d.creatorName ?? APP_NAME}</div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 36, color: C.peach }}>
            <Headline d={d} />
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: qSize, lineHeight: 1.12, letterSpacing: -1.5 }}>{d.question}</div>
          <div style={{ display: "flex", marginTop: 56 }}>
            <Bars d={d} scale={1.3} />
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 26, color: C.muted }}>
            {d.kind === "panta" ? `${asOfText(d.asOf)} · ${closesText(d.closesAt)}` : closesText(d.closesAt)}
          </div>
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 36, background: C.card, borderRadius: 36, padding: 30 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} width={230} height={230} style={{ borderRadius: 18 }} alt="" /> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 1 }}>
              <div style={{ display: "flex", fontSize: 40 }}>Scan or visit</div>
              <div style={{ display: "flex", fontSize: 38, color: C.coral }}>{d.shortUrl}</div>
              <div style={{ display: "flex", fontSize: 24, color: C.muted, marginTop: 8 }}>{disclosure}</div>
              {d.kind === "panta" ? <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{POWERED_BY_PANTA}</div> : null}
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
        <div style={{ width, height, display: "flex", background: `linear-gradient(135deg, ${C.bg2} 0%, ${C.bg} 70%)`, color: C.ink, fontFamily: "Inter", padding: 56, gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, width: 760 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Avatar src={avatar} handle={d.creatorHandle} size={72} />
              <div style={{ display: "flex", fontSize: 32, color: C.peach }}>
                <Headline d={d} />
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: qLen > 80 ? 44 : 54, lineHeight: 1.12, letterSpacing: -1 }}>{d.question}</div>
            <div style={{ display: "flex", flexGrow: 1 }} />
            <Bars d={d} scale={0.8} />
            <div style={{ display: "flex", marginTop: 14, fontSize: 20, color: C.muted }}>
              {d.kind === "panta" ? `${asOfText(d.asOf)} · ${POWERED_BY_PANTA}` : "Free call · no money"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} width={260} height={260} style={{ borderRadius: 16 }} alt="" /> : null}
            <div style={{ display: "flex", fontSize: 24, color: C.coral }}>{d.shortUrl}</div>
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
      <div style={{ width, height, display: "flex", flexDirection: "column", background: `linear-gradient(150deg, ${C.coral} 0%, ${C.bg2} 45%, ${C.bg} 100%)`, color: C.ink, fontFamily: "Inter", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Avatar src={avatar} handle={d.creatorHandle} size={96} />
          <div style={{ display: "flex", fontSize: 40 }}>{`@${d.creatorHandle}`}</div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: qLen > 80 ? 58 : 72, lineHeight: 1.1, letterSpacing: -1.5 }}>{d.question}</div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        {isCover ? (
          <div style={{ display: "flex", fontSize: 30, color: C.peach }}>{`${APP_NAME} · creator call`}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 14 }}>
              <Bars d={d} scale={1} />
              <div style={{ display: "flex", fontSize: 22, color: C.muted }}>{disclosure}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} width={200} height={200} style={{ borderRadius: 16 }} alt="" /> : null}
          </div>
        )}
      </div>
    ),
    { width, height, fonts, headers: { "Cache-Control": isCover ? "public, max-age=86400" : "public, max-age=60, s-maxage=120" } },
  );
}
