"use client";

export type ApiFailure = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly failure: ApiFailure
  ) {
    super(failure.message);
    this.name = "ApiClientError";
  }
}

/**
 * Thin wrapper over fetch that unwraps the `{ data }` / `{ error }` envelope the
 * API always returns, so components deal with values or a typed error — never
 * with response plumbing.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiClientError(response.status, {
      code: error.code ?? "UNKNOWN",
      message: error.message ?? "Something went wrong. Please try again.",
      fieldErrors:
        error.details && typeof error.details === "object"
          ? (error.details as Record<string, string>)
          : undefined,
    });
  }

  return payload?.data as T;
}
