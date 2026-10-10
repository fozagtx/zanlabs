"use client";

import { useEffect } from "react";

// Shown when the root layout itself fails (for example a missing or invalid
// env value). It replaces the whole document, so it carries its own dark
// styles rather than relying on the app stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" style={{ backgroundColor: "#000000", colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, Inter, "Segoe UI", Roboto, sans-serif',
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <main style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 15, lineHeight: 1.45, color: "#a1a1aa", margin: "0 0 24px" }}>
            {error.digest ? `Please try again. If it keeps happening, share this code: ${error.digest}` : "Please try again."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 9999,
              border: 0,
              backgroundColor: "#ffffff",
              color: "#000000",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
