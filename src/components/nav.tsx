"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, Home, Plus, User, Wallet } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { Logo } from "./brand";
import { Avatar, Button, cn } from "./ui";

export function TopBar() {
  const s = useSession();
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {s.authenticated ? (
            <>
              <Link href="/notifications" className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface" aria-label="Notifications">
                <Bell className="size-5" />
                {s.me && s.me.unreadNotifications > 0 ? <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-coral" aria-label={`${s.me.unreadNotifications} unread`} /> : null}
              </Link>
              <Link href={s.me?.role === "creator" && s.me.handle ? `/@${s.me.handle}` : "/wallet"} aria-label="Your profile">
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

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/90 backdrop-blur" aria-label="Main">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-ink" : "text-muted")}
              >
                {t.primary ? (
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-coral text-coral-ink">
                    <Icon className="size-5" strokeWidth={2.75} />
                  </span>
                ) : (
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                )}
                {t.primary ? null : t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
