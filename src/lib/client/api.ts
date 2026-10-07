"use client";

import { errorMessage } from "../panta/errors";

// Browser fetch helper: adds the Privy access token and turns error JSON into
// ApiError with a user-facing message.

export class ApiError extends Error {
  code: string;
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, code: string, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter = async () => null;
export function setTokenGetter(fn: TokenGetter) {
  tokenGetter = fn;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = await tokenGetter().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } & Record<string, unknown> } | null;
  if (!res.ok) {
    const code = json?.error?.code ?? `HTTP_${res.status}`;
    throw new ApiError(res.status, code, json?.error?.message ?? errorMessage(code), json?.error ?? {});
  }
  return json as T;
}

export function isUserRejection(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return /reject|denied|cancel|declin|closed|user exited/.test(msg);
}
