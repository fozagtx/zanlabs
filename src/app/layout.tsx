import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav, TopBar } from "@/components/nav";
import { InAppBanner } from "@/components/in-app-banner";
import { SandboxBanner } from "@/components/brand";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl()),
  title: { default: `${APP_NAME} — creator calls`, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  openGraph: { siteName: APP_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const privyAppId = env.privyAppId() ?? null;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  return (
    // Inline black so the page is dark before the stylesheet arrives, and on
    // browsers that skip Tailwind's cascade layers.
    <html lang="en" style={{ backgroundColor: "#000000", colorScheme: "dark" }}>
      <body className="min-h-[100dvh] bg-canvas text-fg antialiased" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
        <Providers privyAppId={privyAppId} rpcUrl={rpcUrl}>
          {env.pantaSandbox() ? <SandboxBanner /> : null}
          <InAppBanner />
          <TopBar />
          <main className="mx-auto w-full max-w-md pb-24">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
