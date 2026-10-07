import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#110b1c" }}>
        <div style={{ width: 400, height: 400, borderRadius: 96, background: "#FF6B5B", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a0f0b", fontSize: 300, fontWeight: 900 }}>
          Z
        </div>
      </div>
    ),
    size,
  );
}
