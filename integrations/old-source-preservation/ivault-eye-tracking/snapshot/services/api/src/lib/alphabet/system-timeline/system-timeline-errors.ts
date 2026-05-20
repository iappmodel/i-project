export class SystemTimelineError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "SystemTimelineError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function systemTimelineFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new SystemTimelineError(params);
}
