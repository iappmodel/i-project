export type ApiErrorDto = {
  code: string;
  category: string;
  message: string;
  retryable: boolean;
  httpStatus: number;
  details?: Record<string, unknown>;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  error: null;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  data: null;
  error: ApiErrorDto;
  requestId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, requestId: string): ApiSuccess<T> {
  return {
    ok: true,
    data,
    error: null,
    requestId
  };
}

export function fail(error: ApiErrorDto, requestId: string): ApiFailure {
  return {
    ok: false,
    data: null,
    error,
    requestId
  };
}
