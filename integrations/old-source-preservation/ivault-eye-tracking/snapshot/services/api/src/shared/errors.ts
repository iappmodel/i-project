import type { ApiErrorDto } from "./api-response";

export const COMMON_ERRORS = {
  authRequired: {
    code: "AUTH_REQUIRED",
    category: "auth",
    message: "You need to sign in.",
    retryable: false,
    httpStatus: 401
  },
  permissionDenied: {
    code: "PERMISSION_DENIED",
    category: "permission",
    message: "You do not have permission to do that.",
    retryable: false,
    httpStatus: 403
  },
  badRequest: {
    code: "BAD_REQUEST",
    category: "validation",
    message: "Request validation failed.",
    retryable: false,
    httpStatus: 400
  },
  internal: {
    code: "SYSTEM_INTERNAL_ERROR",
    category: "system",
    message: "Something went wrong. Please try again.",
    retryable: true,
    httpStatus: 500
  }
} satisfies Record<string, ApiErrorDto>;
