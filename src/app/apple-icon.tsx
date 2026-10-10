import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iOS rounds the corners itself): the same mark as icon.tsx,
// a white rounded square with YES and NO edges and a black "z" on black.
const YES = "#22E39B";
const NO = "#FF4F70";

async function interBold(): Promise<ArrayBuffer | null> {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "assets", "fonts", "Inter-Bold.otf"));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

export default async function AppleIcon() {
  const font = await interBold();
  const tile = 114;
  const edge = 12;
  const radius = 30;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <div style={{ display: "flex", position: "relative", width: tile + edge * 2, height: tile }}>
          <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: tile, height: tile, borderRadius: radius, background: YES }} />
          <div style={{ display: "flex", position: "absolute", right: 0, top: 0, width: tile, height: tile, borderRadius: radius, background: NO }} />
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: edge,
              top: 0,
              width: tile,
              height: tile,
              borderRadius: radius,
              background: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              color: "#000000",
              fontFamily: font ? "Inter" : undefined,
              fontSize: 99,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            <div style={{ display: "flex", marginTop: -13 }}>z</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Inter", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
