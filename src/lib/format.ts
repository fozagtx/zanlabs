// Display helpers. Probabilities show as "62%", money as "$5.00", never as raw prices.

export function pct(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return "--";
  const v = p * 100;
  if (v > 0 && v < 1) return "<1%";
  if (v < 100 && v > 99) return ">99%";
  return `${Math.round(v)}%`;
}

export function usd(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "--";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function usdCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "--";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return usd(n, n < 10 ? 2 : 0);
}

export function shortAddr(a: string | null | undefined, n = 4): string {
  if (!a) return "--";
  return a.length <= n * 2 + 1 ? a : `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function relTime(sec: number | null | undefined, nowSec = Math.floor(Date.now() / 1000)): string {
  if (!sec) return "--";
  const d = sec - nowSec;
  const abs = Math.abs(d);
  const unit =
    abs < 60 ? `${abs}s` : abs < 3600 ? `${Math.round(abs / 60)}m` : abs < 86400 ? `${Math.round(abs / 3600)}h` : `${Math.round(abs / 86400)}d`;
  return d >= 0 ? `in ${unit}` : `${unit} ago`;
}

export function countdown(sec: number | null | undefined, nowSec = Math.floor(Date.now() / 1000)): string {
  if (!sec) return "--";
  let d = sec - nowSec;
  if (d <= 0) return "closed";
  const days = Math.floor(d / 86400);
  d -= days * 86400;
  const h = Math.floor(d / 3600);
  d -= h * 3600;
  const m = Math.floor(d / 60);
  if (days > 0) return `${days}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function localDateTime(sec: number | null | undefined): string {
  if (!sec) return "--";
  return new Date(sec * 1000).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function toDatetimeLocal(sec: number): string {
  const d = new Date(sec * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
