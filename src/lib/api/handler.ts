import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isDuplicateKeyError } from "@/lib/db";

import { ApiError } from "./errors";

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/** Uniform success envelope so clients never have to guess the shape. */
export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(
    { data },
    typeof init === "number" ? { status: init } : init
  );
}

/**
 * Centralised error handling. Every route handler is wrapped in this, so:
 *   - Zod failures become 400 with per-field details
 *   - ApiError instances keep their intended status + code
 *   - anything else becomes a 500 that never leaks internals to the client
 */
export function withRoute<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields need attention.",
          details: flattenZodError(error),
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status }
    );
  }

  // MySQL duplicate-key safety net, in case a race slips past an explicit check.
  if (isDuplicateKeyError(error)) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "That record already exists." } },
      { status: 409 }
    );
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } },
    { status: 500 }
  );
}

/** { fieldName: "first message" } — exactly what the form layer needs. */
export function flattenZodError(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
