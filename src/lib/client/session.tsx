"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useExportWallet, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { api, setTokenGetter } from "./api";
import type { MeView } from "../types";
import { detectBrowser, isInAppBrowser, type BrowserKind } from "../ua";
import { SOLANA_CHAIN } from "../config";

// One session context for the whole app. When Privy isn't configured the app
// still renders (browsing works) and every sign-in action explains why not.

export type Session = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  me: MeView | null;
  /** The account sync after sign-in failed; `me` stays null until a retry works. */
  meFailed: boolean;
  refreshMe: () => Promise<MeView | null>;
  setMe: (me: MeView) => void;
  login: () => void;
  logout: () => Promise<void>;
  activeWallet: string | null;
  signTransaction: (txB64: string, address: string) => Promise<string>;
  linkSocial: (p: "x" | "instagram" | "tiktok") => void;
  exportWallet: (address: string) => Promise<void>;
  browser: BrowserKind;
  inApp: boolean;
};

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

function useBrowserKind(): BrowserKind {
  const [kind, setKind] = useState<BrowserKind>("browser");
  useEffect(() => setKind(detectBrowser(navigator.userAgent)), []);
  return kind;
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const notConfigured = async (): Promise<never> => {
  throw new Error("Sign-in isn't set up on this deployment yet.");
};

export function NoAuthSession({ children }: { children: ReactNode }) {
  const browser = useBrowserKind();
  const value = useMemo<Session>(
    () => ({
      configured: false,
      ready: true,
      authenticated: false,
      me: null,
      meFailed: false,
      refreshMe: async () => null,
      setMe: () => {},
      login: () => alert("Sign-in isn't set up on this deployment yet (missing Privy app id)."),
      logout: async () => {},
      activeWallet: null,
      signTransaction: notConfigured,
      linkSocial: () => {},
      exportWallet: notConfigured,
      browser,
      inApp: isInAppBrowser(browser),
    }),
    [browser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function PrivySession({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction: privySign } = useSignTransaction();
  const { exportWallet: privyExport } = useExportWallet();
  const browser = useBrowserKind();
  const inApp = isInAppBrowser(browser);
  const [me, setMe] = useState<MeView | null>(null);
  const [meFailed, setMeFailed] = useState(false);
  const lastSyncKey = useRef<string>("");

  useEffect(() => {
    setTokenGetter(() => privy.getAccessToken());
  }, [privy]);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api<MeView>("/api/me");
      setMe(m);
      return m;
    } catch {
      return null;
    }
  }, []);

  // Sync wallets/socials from Privy after login and whenever the wallet list changes.
  const walletKey = wallets.map((w) => w.address).sort().join(",");
  const linkedKey = (privy.user?.linkedAccounts ?? []).map((a) => a.type).sort().join(",");
  useEffect(() => {
    if (!privy.ready || !privy.authenticated) {
      if (privy.ready && !privy.authenticated) setMe(null);
      return;
    }
    const key = `${privy.user?.id}|${walletKey}|${linkedKey}`;
    if (key === lastSyncKey.current) return;
    lastSyncKey.current = key;
    api<MeView>("/api/me/sync", { method: "POST", body: {} })
      .then((m) => {
        setMe(m);
        setMeFailed(false);
      })
      .catch(() => {
        lastSyncKey.current = "";
        setMeFailed(true);
      });
  }, [privy.ready, privy.authenticated, privy.user?.id, walletKey, linkedKey]);

  const signTransaction = useCallback(
    async (txB64: string, address: string) => {
      const wallet = wallets.find((w) => w.address === address);
      if (!wallet) throw new Error("Your wallet isn't connected yet. Wait a moment and try again.");
      const { signedTransaction } = await privySign({ transaction: b64ToBytes(txB64), wallet, chain: SOLANA_CHAIN });
      return bytesToB64(signedTransaction);
    },
    [wallets, privySign],
  );

  const value = useMemo<Session>(
    () => ({
      configured: true,
      ready: privy.ready,
      authenticated: privy.authenticated,
      me,
      meFailed,
      refreshMe,
      setMe,
      // Google sign-in is blocked inside Instagram/TikTok/Facebook webviews: offer phone/email there.
      login: () => (inApp ? privy.login({ loginMethods: ["sms", "email"] }) : privy.login()),
      logout: async () => {
        await privy.logout();
        setMe(null);
        lastSyncKey.current = "";
      },
      activeWallet: me?.activeWallet ?? wallets[0]?.address ?? null,
      signTransaction,
      linkSocial: (p) => (p === "x" ? privy.linkTwitter() : p === "instagram" ? privy.linkInstagram() : privy.linkTiktok()),
      exportWallet: (address) => privyExport({ address }),
      browser,
      inApp,
    }),
    [privy, me, meFailed, refreshMe, wallets, signTransaction, privyExport, browser, inApp],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
