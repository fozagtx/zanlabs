"use client";

import { Delete } from "lucide-react";
import { cn } from "./ui";

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

/**
 * Pure keypad reducer: returns the next amount string, or the same string when
 * the key is rejected (too many decimals, above `max`, a second "."). An empty
 * amount is "0", so backspacing all the way lands on "0".
 */
export function applyKey(value: string, key: KeypadKey, opts: { max?: number; decimals?: number } = {}): string {
  const decimals = Math.max(0, Math.floor(opts.decimals ?? 2));
  const current = value === "" ? "0" : value;

  if (key === "back") {
    const next = current.slice(0, -1);
    return next === "" || next === "-" ? "0" : next;
  }

  let next: string;
  if (key === ".") {
    if (decimals === 0 || current.includes(".")) return current;
    next = `${current}.`;
  } else {
    const dot = current.indexOf(".");
    if (dot >= 0 && current.length - dot - 1 >= decimals) return current;
    next = current === "0" ? key : `${current}${key}`;
  }

  if (opts.max !== undefined && Number.isFinite(opts.max) && Number(next) > opts.max) return current;
  return next;
}

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

/**
 * Cash App-style numeric keypad. Controlled: shows nothing itself, the screen
 * renders the big amount from `value`. Keys are 64px tall.
 */
export function Keypad({
  value,
  onChange,
  max,
  decimals = 2,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: number;
  decimals?: number;
  disabled?: boolean;
  className?: string;
}) {
  function press(key: KeypadKey) {
    const next = applyKey(value, key, { max, decimals });
    if (next !== value) onChange(next);
  }

  return (
    <div role="group" aria-label="Amount keypad" className={cn("grid grid-cols-3 gap-1 select-none", className)}>
      {KEYS.map((k) => {
        const hidden = k === "." && decimals <= 0;
        return (
          <button
            key={k}
            type="button"
            disabled={disabled || hidden}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
            aria-label={k === "back" ? "Delete" : k === "." ? "Decimal point" : k}
            onClick={() => press(k)}
            className={cn(
              "num inline-flex h-16 items-center justify-center rounded-2xl text-[28px] font-medium text-fg",
              "transition-[scale,background-color] duration-[120ms] ease-out active:scale-[0.97] active:bg-card-2 disabled:active:scale-100 disabled:active:bg-transparent",
              hidden && "invisible",
              disabled && !hidden && "opacity-40",
            )}
          >
            {k === "back" ? <Delete className="size-7" strokeWidth={1.75} aria-hidden /> : k === "." ? "." : k}
          </button>
        );
      })}
    </div>
  );
}
