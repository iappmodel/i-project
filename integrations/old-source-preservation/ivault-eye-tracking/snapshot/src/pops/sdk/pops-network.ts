import type {
  PopsClockDriftSample,
  PopsClientConfig,
  PopsDeviceContext,
  PopsMomentStatus,
  PopsNetworkAdapter,
  PopsNetworkRequestOptions,
  PopsPrivacyReceipt,
  PopsSdkSessionEvent,
  PopsStartMomentInput,
} from "./pops-client.types";

type HttpMethod = "GET" | "POST";

type RequestContext = {
  path: string;
  method: HttpMethod;
  body?: Record<string, unknown>;
  options?: PopsNetworkRequestOptions;
};

export class PopsNetworkClient implements PopsNetworkAdapter {
  private drift?: PopsClockDriftSample;

  constructor(
    private readonly config: PopsClientConfig,
    private readonly now: () => number,
  ) {}

  getClockDriftSample(): PopsClockDriftSample | undefined {
    return this.drift;
  }

  async startMoment(input: PopsStartMomentInput, context: PopsDeviceContext) {
    return this.requestWithRetry<{
      sessionId: string;
      serverTimeMs?: number;
      checkpointToken?: string;
    }>({
      method: "POST",
      path: "/v1/pops/sdk/start",
      body: { input, context },
    });
  }

  async sendEvents(sessionId: string, events: PopsSdkSessionEvent[]) {
    return this.requestWithRetry<{ acceptedCount: number; serverTimeMs?: number }>({
      method: "POST",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/events`,
      body: { events },
    });
  }

  async checkpoint(sessionId: string) {
    return this.requestWithRetry<{ checkpointId: string }>({
      method: "POST",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/checkpoint`,
    });
  }

  async completeMoment(sessionId: string) {
    return this.requestWithRetry<{ status: "pending" | "completed"; rewardDecision?: PopsMomentStatus["rewardDecision"] }>({
      method: "POST",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/complete`,
    });
  }

  async cancelMoment(sessionId: string, reason: string) {
    return this.requestWithRetry<{ cancelled: true }>({
      method: "POST",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/cancel`,
      body: { reason },
    });
  }

  async getMomentStatus(sessionId: string) {
    return this.requestWithRetry<PopsMomentStatus>({
      method: "GET",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/status`,
    });
  }

  async getPrivacyReceipt(sessionId: string) {
    return this.requestWithRetry<PopsPrivacyReceipt>({
      method: "GET",
      path: `/v1/pops/sdk/sessions/${encodeURIComponent(sessionId)}/privacy-receipt`,
    });
  }

  private async requestWithRetry<T>(ctx: RequestContext): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 5;
    const base = this.config.retryBaseDelayMs ?? 250;
    const maxDelay = this.config.retryMaxDelayMs ?? 8_000;
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= maxRetries) {
      try {
        return await this.request<T>(ctx);
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) break;
        const exp = Math.min(maxDelay, base * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * Math.floor(exp * 0.2));
        await delay(exp + jitter);
      }
      attempt += 1;
    }
    throw lastError instanceof Error ? lastError : new Error("POPS network request failed");
  }

  private async request<T>(ctx: RequestContext): Promise<T> {
    if (typeof fetch !== "function") {
      throw new Error("fetch_not_available");
    }
    const localSentAtMs = this.now();
    const response = await fetch(`${this.config.apiBaseUrl}${ctx.path}`, {
      method: ctx.method,
      headers: {
        "content-type": "application/json",
        ...(this.config.authToken ? { authorization: `Bearer ${this.config.authToken}` } : {}),
        ...(ctx.options?.headers ?? {}),
      },
      body: ctx.body ? JSON.stringify(ctx.body) : undefined,
      signal: ctx.options?.timeoutMs ? AbortSignal.timeout(ctx.options.timeoutMs) : undefined,
    });
    const localReceivedAtMs = this.now();
    const serverTimeHeader = response.headers.get("date");
    if (serverTimeHeader) {
      const serverTimeMs = new Date(serverTimeHeader).getTime();
      if (Number.isFinite(serverTimeMs)) {
        this.drift = {
          localSentAtMs,
          localReceivedAtMs,
          serverTimeMs,
          roundTripMs: localReceivedAtMs - localSentAtMs,
          driftMs: serverTimeMs - Math.floor((localSentAtMs + localReceivedAtMs) / 2),
        };
      }
    }
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return (await response.json()) as T;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
