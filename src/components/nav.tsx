"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, Compass, Home, Plus, User, Wallet } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { Logo } from "./brand";
import { Avatar, Button, cn } from "./ui";

export type TopBarVariant = "solid" | "overlay";

/* A page can change the global top bar while it is mounted (<TopBarMode />)
   and put content in its center (<TopBarSlot />). */
let modeOverride: TopBarVariant | "hidden" | null = null;
const modeListeners = new Set<() => void>();
function setModeOverride(v: TopBarVariant | "hidden" | null) {
  modeOverride = v;
  modeListeners.forEach((l) => l());
}
function subscribeMode(l: () => void) {
  modeListeners.add(l);
  return () => {
    modeListeners.delete(l);
  };
}

/** Render on a page to switch the global top bar to "overlay", "solid" or "hidden" while that page is mounted. */
export function TopBarMode({ variant }: { variant: TopBarVariant | "hidden" }) {
  useLayoutEffect(() => {
    setModeOverride(variant);
    return () => setModeOverride(null);
  }, [variant]);
  return null;
}

const SLOT_ID = "zan-topbar-center";

/** Portals its children into the center of the global top bar (e.g. "Following | For you" on the feed). */
export function TopBarSlot({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(SLOT_ID));
  }, []);
  return el ? createPortal(children, el) : null;
}

/**
 * Global top bar. "overlay" (default on "/") is transparent over a top scrim and
 * takes no layout space, for the full-bleed feed; "solid" (default elsewhere)
 * is a sticky black bar. Height is var(--top-bar-h) either way.
 */
export function TopBar({ variant, className }: { variant?: TopBarVariant; className?: string }) {
  const s = useSession();
  const path = usePathname();
  const override = useSyncExternalStore(subscribeMode, () => modeOverride, () => null);
  const mode = variant ?? override ?? (path === "/" ? "overlay" : "solid");
  if (mode === "hidden") return null;
  const overlay = mode === "overlay";

  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-30",
        overlay ? "pointer-events-none -mb-[var(--top-bar-h)] scrim-top" : "border-b border-hairline bg-canvas/85 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto grid h-14 max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <Link href="/" aria-label="Zan home" className="pointer-events-auto inline-flex h-11 items-center justify-self-start">
          <Logo markOnly={overlay} className={overlay ? "legible" : undefined} />
        </Link>
        <div id={SLOT_ID} className="pointer-events-auto flex min-w-0 items-center justify-center" />
        <div className="pointer-events-auto flex items-center gap-1 justify-self-end">
          {s.authenticated ? (
            <>
              <Link
                href="/notifications"
                className={cn(
                  "relative inline-flex size-11 items-center justify-center rounded-full transition-colors",
                  overlay ? "hover:bg-black/30" : "hover:bg-card",
                )}
                aria-label={s.me && s.me.unreadNotifications > 0 ? `Notifications, ${s.me.unreadNotifications} unread` : "Notifications"}
              >
                <Bell className={cn("size-[22px]", overlay && "drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]")} aria-hidden />
                {s.me && s.me.unreadNotifications > 0 ? <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-accent ring-2 ring-canvas" aria-hidden /> : null}
              </Link>
              <Link
                href={s.me?.role === "creator" && s.me.handle ? `/@${s.me.handle}` : "/wallet"}
                aria-label="Your profile"
                className="inline-flex size-11 items-center justify-center rounded-full"
              >
                <Avatar src={s.me?.avatarUrl} name={s.me?.handle ?? s.me?.displayName ?? "you"} size={32} />
              </Link>
            </>
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
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: Plus, primary: true },
  { href: "/portfolio", label: "Picks", icon: User },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

/** TikTok-style create button: a white rounded rectangle with a YES left edge and a NO right edge. */
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
