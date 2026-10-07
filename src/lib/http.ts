import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PantaError } from "./panta/client";
import { errorMessage } from "./panta/errors";

export class HttpError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;
  constructor(status: number, code: string, message?: string, extra?: Record<string, unknown>) {
    super(message ?? errorMessage(code));
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, ...e.extra } }, { status: e.status });
  }
  if (e instanceof PantaError) {
    const status = e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json(
      { error: { code: e.code, message: errorMessage(e.code, e.message), field: e.field, fields: e.fields } },
      { status },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error", e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong on our side." } }, { status: 500 });
}

/** Wrap a route handler so thrown errors become consistent JSON responses. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Expected a JSON body.");
  }
}
