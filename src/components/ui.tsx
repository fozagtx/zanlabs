"use client";

import Link from "next/link";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { pct as fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export { cn };

/* ------------------------------------------------------------------------ */
/* Buttons                                                                   */
/* ------------------------------------------------------------------------ */

/** `outline` is a v1 name kept as an alias of `secondary`. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "yes" | "no" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-black hover:bg-white/90",
  secondary: "bg-card text-fg hover:bg-card-2",
  outline: "bg-card text-fg hover:bg-card-2",
  ghost: "bg-transparent text-fg hover:bg-card",
  yes: "bg-yes text-yes-ink hover:brightness-105",
  no: "bg-no text-no-ink hover:brightness-105",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

// sm 36px (compact chips and inline actions), md 44px, lg 52px, xl 60px.
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-6 text-base",
  xl: "h-[60px] px-7 text-[17px]",
};

const pressable =
  "transition-[scale,background-color,filter,opacity] duration-[120ms] ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-w-11 select-none items-center justify-center gap-2 rounded-full font-semibold",
        pressable,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

/** Round icon-only button. `label` is required and becomes the aria-label. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
    label: string;
    variant?: "ghost" | "secondary" | "overlay";
    size?: "md" | "lg";
  }
>(function IconButton({ label, variant = "ghost", size = "md", className, children, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-fg",
        pressable,
        size === "lg" ? "size-12" : "size-11",
        variant === "secondary" && "bg-card hover:bg-card-2",
        variant === "ghost" && "hover:bg-card",
        variant === "overlay" && "bg-black/35 backdrop-blur-md hover:bg-black/50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/**
 * Kalshi-style trade button: "✓ Yes 62%" / "✕ No 38%".
 * `pct` is the chance of THIS side as a probability 0..1 (e.g. `m.yes` for YES,
 * `1 - m.yes` for NO); null/undefined hides the number.
 */
export const TradeButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    side: "yes" | "no";
    pct?: number | null;
    size?: "md" | "lg" | "xl";
    variant?: "solid" | "soft";
    /** Replaces the "Yes"/"No" word. The ✓/✕ icon always stays. */
    label?: ReactNode;
    loading?: boolean;
  }
>(function TradeButton({ side, pct, size = "lg", variant = "solid", label, loading, disabled, className, type = "button", ...rest }, ref) {
  const Icon = side === "yes" ? Check : X;
  const word = label ?? (side === "yes" ? "Yes" : "No");
  const tint =
    variant === "solid"
      ? side === "yes"
        ? "bg-yes text-yes-ink hover:brightness-105"
        : "bg-no text-no-ink hover:brightness-105"
      : side === "yes"
        ? "bg-yes/15 text-yes hover:bg-yes/25"
        : "bg-no/15 text-no hover:bg-no/25";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex w-full min-w-0 select-none items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap",
        pressable,
        size === "md" ? "h-11 px-4 text-[15px]" : size === "lg" ? "h-[52px] px-5 text-[17px]" : "h-[60px] px-6 text-[19px]",
        tint,
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Icon className="size-5 shrink-0" strokeWidth={3} aria-hidden />}
      <span className="truncate">{word}</span>
      {pct === null || pct === undefined ? null : <span className="num font-semibold opacity-80">{fmtPct(pct)}</span>}
    </button>
  );
});

/* ------------------------------------------------------------------------ */
/* Pills, avatars, cards                                                     */
/* ------------------------------------------------------------------------ */

/** `coral` is the v1 accent tone; it now renders as a neutral white-on-glass pill. */
export type PillTone = "default" | "muted" | "yes" | "no" | "coral" | "brand" | "accent" | "warn" | "danger";

const pillTones: Record<PillTone, string> = {
  default: "bg-card text-fg",
  muted: "bg-card text-fg-2",
  yes: "bg-yes/15 text-yes",
  no: "bg-no/15 text-no",
  coral: "bg-white/10 text-fg",
  brand: "bg-brand text-black",
  accent: "bg-accent/15 text-accent",
  warn: "bg-warn/15 text-warn",
  danger: "bg-danger/15 text-danger",
};

export function Pill({
  children,
  tone = "default",
  size = "md",
  className,
  title,
}: {
  children: ReactNode;
  tone?: PillTone;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Round avatar. `size` is the outer footprint in px, including the story ring
 * when `ring` is "lit" (accent gradient) or "dim" (hairline).
 */
export function Avatar({
  src,
  name,
  size = 40,
  ring = "none",
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  ring?: "lit" | "dim" | "none";
  className?: string;
}) {
  const initial = name.replace(/^@/, "").slice(0, 1).toUpperCase() || "?";
  const band = ring === "none" ? 0 : Math.max(2, Math.round(size * 0.04));
  const inner = size - band * 4;
  const face = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={inner}
      height={inner}
      className={cn("block shrink-0 rounded-full bg-card-2 object-cover", ring === "none" && className)}
      style={{ width: inner, height: inner }}
    />
  ) : (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-card-2 font-bold text-fg", ring === "none" && className)}
      style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.42) }}
    >
      {initial}
    </span>
  );
  if (ring === "none") return face;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        ring === "lit" ? "bg-gradient-to-tr from-accent to-accent-2" : "bg-hairline",
        className,
      )}
      style={{ width: size, height: size, padding: band }}
    >
      <span className="inline-flex rounded-full bg-canvas" style={{ padding: band }}>
        {face}
      </span>
    </span>
  );
}

/** v1 boxed card. New screens should prefer ListRow groups over boxes. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-card p-4", className)}>{children}</div>;
}

export function Empty({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      {icon ? <div className="mb-1 inline-flex size-14 items-center justify-center rounded-full bg-card text-fg-2 [&_svg]:size-6">{icon}</div> : null}
      <p className="text-[17px] font-bold tracking-[-0.01em]">{title}</p>
      {body ? <div className="max-w-sm text-[15px] leading-[1.45] text-fg-2">{body}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 role="status" className={cn("size-5 animate-spin text-fg-2", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-card", className)} />;
}

/* ------------------------------------------------------------------------ */
/* Forms                                                                     */
/* ------------------------------------------------------------------------ */

export function Label({ children, hint, htmlFor, className }: { children: ReactNode; hint?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-sm font-semibold text-fg">{children}</span>
      {hint ? <span className="text-[13px] text-fg-3">{hint}</span> : null}
    </label>
  );
}

// 16px text so iOS Safari does not zoom on focus.
const field =
  "w-full rounded-2xl border border-transparent bg-card px-4 text-base text-fg placeholder:text-fg-3 transition-colors focus:border-fg-3 focus:bg-card-2 focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(field, "h-12", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-28 py-3 leading-[1.45]", className)} {...rest} />;
});

export function Checkbox({
  checked,
  onChange,
  children,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-1 text-[15px] leading-[1.45]", disabled && "cursor-not-allowed opacity-50", className)}>
      <span className="relative mt-px inline-flex size-[22px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[7px] border-2 border-fg-3 bg-transparent transition-colors checked:border-fg checked:bg-fg disabled:cursor-not-allowed"
        />
        <Check className="pointer-events-none relative m-auto size-4 text-canvas opacity-0 peer-checked:opacity-100" strokeWidth={3.5} aria-hidden />
      </span>
      <span className="text-fg/90">{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------------ */
/* Tabs                                                                      */
/* ------------------------------------------------------------------------ */

type TabOption<T extends string> = { value: T; label: ReactNode; count?: number | null };

/**
 * Underline tabs (TikTok / Instagram). `align="fill"` stretches the tabs across
 * the width with a hairline under the row; `"center"` and `"start"` size them
 * to their labels (use `"center"` for "Following | For you" over the feed).
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  align = "fill",
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: TabOption<T>[];
  align?: "fill" | "center" | "start";
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar flex overflow-x-auto",
        align === "fill" ? "border-b border-hairline" : "gap-5",
        align === "center" && "justify-center",
        className,
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 text-[15px] font-semibold transition-colors duration-150",
              align === "fill" && "flex-1 px-3",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count !== null ? <span className="num text-[13px] font-medium text-fg-3">{o.count}</span> : null}
            <span
              aria-hidden
              className={cn(
                "absolute bottom-0 h-0.5 rounded-full bg-fg transition-opacity duration-150",
                align === "fill" ? "inset-x-3" : "left-1/2 w-6 -translate-x-1/2",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control (range chips, filters). Scrolls horizontally when it overflows. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  full,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
  /** Stretch the segments to fill the row. */
  full?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-card p-1", full ? "w-full" : "w-fit", className)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm",
              full && "flex-1",
              active ? "bg-fg text-canvas" : "text-fg-2 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Rows and stats                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Flighty-style info row: label left, value right, hairline divider below
 * (the last row in a group drops its divider). Becomes a link with `href`
 * (external when it starts with http) or a button with `onClick`.
 */
export function ListRow({
  label,
  value,
  sub,
  href,
  onClick,
  icon,
  chevron,
  tone = "default",
  disabled,
  className,
}: {
  label: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  chevron?: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const interactive = Boolean(href || onClick);
  const showChevron = chevron ?? interactive;
  const body = (
    <>
      {icon ? (
        <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card [&_svg]:size-[18px]", tone === "danger" ? "text-danger" : "text-fg")}>{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] leading-[1.35]", tone === "danger" ? "font-semibold text-danger" : value !== undefined ? "text-fg-2" : "text-fg")}>{label}</span>
        {sub ? <span className="mt-0.5 block text-[13px] leading-[1.35] text-fg-3">{sub}</span> : null}
      </span>
      {value !== undefined ? <span className="num min-w-0 max-w-[60%] shrink-0 truncate text-right text-[15px] font-medium text-fg">{value}</span> : null}
      {showChevron ? <ChevronRight className="size-4 shrink-0 text-fg-3" aria-hidden /> : null}
    </>
  );
  const base = cn(
    "flex min-h-12 w-full items-center gap-3 border-b border-hairline py-3.5 text-left last:border-b-0",
    interactive && "transition-opacity active:opacity-60",
    disabled && "pointer-events-none opacity-50",
    className,
  );
  if (href) {
    if (/^https?:\/\//.test(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
          {body}
        </a>
      );
    }
    return (
      <Link href={href} className={base}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={base}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

export function SectionLabel({
  children,
  action,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  /** Optional right-aligned link or button, e.g. "See all". */
  action?: ReactNode;
  as?: "h2" | "h3" | "p" | "div";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Tag className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-3">{children}</Tag>
      {action ? <div className="text-[13px] font-semibold text-fg-2">{action}</div> : null}
    </div>
  );
}

/** Instagram-style stats: big number over a small label, evenly spaced. */
export function StatRow({ items, className }: { items: { label: ReactNode; value: ReactNode; href?: string }[]; className?: string }) {
  return (
    <ul className={cn("grid", className)} style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
      {items.map((it, i) => {
        const inner = (
          <>
            <span className="num block text-[17px] font-bold leading-tight text-fg">{it.value}</span>
            <span className="mt-0.5 block text-[13px] text-fg-2">{it.label}</span>
          </>
        );
        const cls = "flex min-h-11 flex-col items-center justify-center text-center";
        return (
          <li key={i} className="min-w-0">
            {it.href ? (
              <Link href={it.href} className={cn(cls, "transition-opacity active:opacity-60")}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
