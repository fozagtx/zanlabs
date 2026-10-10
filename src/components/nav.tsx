"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { Home, Plus, User, Wallet } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { Logo } from "./brand";
import { Avatar, Button, cn } from "./ui";

export type TopBarVariant = "solid" | "hidden";

/* A page can hide the global top bar while it is mounted (<TopBarMode variant="hidden" />),
   e.g. a market page with its own header. */
let modeOverride: TopBarVariant | null = null;
const modeListeners = new Set<() => void>();
function setModeOverride(v: TopBarVariant | null) {
  modeOverride = v;
  modeListeners.forEach((l) => l());
}
function subscribeMode(l: () => void) {
  modeListeners.add(l);
  return () => {
    modeListeners.delete(l);
  };
}

/** Render on a page to switch the global top bar to "hidden" (or back to "solid") while that page is mounted. */
export function TopBarMode({ variant }: { variant: TopBarVariant }) {
  useLayoutEffect(() => {
    setModeOverride(variant);
    return () => setModeOverride(null);
  }, [variant]);
  return null;
}

/** Global top bar: a sticky black bar with the logo, and sign in or your avatar. Height is var(--top-bar-h). */
export function TopBar({ className }: { className?: string }) {
  const s = useSession();
  const mode = useSyncExternalStore(subscribeMode, () => modeOverride, () => null) ?? "solid";
  if (mode === "hidden") return null;

  return (
    <header className={cn("safe-top sticky top-0 z-30 border-b border-hairline bg-canvas", className)}>
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="Zan home" className="inline-flex h-11 items-center">
          <Logo />
        </Link>
        <div className="flex items-center">
          {s.authenticated ? (
            <Link
              href={s.me?.role === "creator" && s.me.handle ? `/@${s.me.handle}` : "/wallet"}
              aria-label={s.me?.role === "creator" ? "Your page" : "Your wallet"}
              className="inline-flex size-11 items-center justify-center rounded-full"
            >
              <Avatar src={s.me?.avatarUrl} name={s.me?.handle ?? s.me?.displayName ?? "you"} size={32} />
            </Link>
          ) : (
            <Button size="sm" onClick={s.login} disabled={!s.ready}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Plus, primary: true },
  { href: "/portfolio", label: "Picks", icon: User },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

/** Create button: a white rounded rectangle with a YES left edge and a NO right edge. */
function CreateGlyph() {
  return (
    <span aria-hidden className="relative inline-flex h-8 w-12 items-center justify-center transition-transform duration-[120ms] ease-out group-active:scale-[0.94]">
      <span className="absolute inset-y-0 left-0 w-10 rounded-[10px] bg-yes" />
      <span className="absolute inset-y-0 right-0 w-10 rounded-[10px] bg-no" />
      <span className="relative inline-flex h-8 w-10 items-center justify-center rounded-[10px] bg-white text-black">
        <Plus className="size-5" strokeWidth={3} />
      </span>
    </span>
  );
}

/** Fixed black bottom bar. Height is var(--bottom-nav-h) including the home-indicator inset. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas" aria-label="Main">
      <ul className="mx-auto flex h-14 max-w-md items-stretch justify-around px-1">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {t.primary ? (
                  <>
                    <CreateGlyph />
                    <span className="sr-only">{t.label}</span>
                  </>
                ) : (
                  <>
                    <Icon className="size-6" strokeWidth={active ? 2.5 : 1.75} aria-hidden />
                    {t.label}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
