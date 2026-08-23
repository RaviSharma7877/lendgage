/** Machine-readable error codes returned to the client. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (message = "Authentication required.") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have access to this resource.") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Resource not found.") =>
  new ApiError(404, "NOT_FOUND", message);
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);
export const payloadTooLarge = (message: string) =>
  new ApiError(413, "PAYLOAD_TOO_LARGE", message);
export const unsupportedMediaType = (message: string) =>
  new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", message);
