import type { PopsStorageAdapter } from "./pops-client.types";

type JsonValue = Record<string, unknown> | unknown[];

export class PopsStorage {
  constructor(
    private readonly adapter: PopsStorageAdapter,
    private readonly namespace: string,
  ) {}

  async readJson<T extends JsonValue>(key: string, fallback: T): Promise<T> {
    const raw = await this.adapter.getItem(this.key(key));
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async writeJson(key: string, value: JsonValue): Promise<void> {
    await this.adapter.setItem(this.key(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await this.adapter.removeItem(this.key(key));
  }

  private key(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

export function createDefaultStorageAdapter(): PopsStorageAdapter {
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        try {
          return globalThis.localStorage.getItem(key);
        } catch {
          return memory.get(key) ?? null;
        }
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        try {
          globalThis.localStorage.setItem(key, value);
          return;
        } catch {
          memory.set(key, value);
          return;
        }
      }
      memory.set(key, value);
    },
    removeItem(key) {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        try {
          globalThis.localStorage.removeItem(key);
          return;
        } catch {
          memory.delete(key);
          return;
        }
      }
      memory.delete(key);
    },
  };
}
