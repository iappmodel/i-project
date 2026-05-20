export type CursorPayload = {
  timestamp: string;
  id: string;
};

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (
      !parsed ||
      typeof parsed.timestamp !== "string" ||
      typeof parsed.id !== "string"
    ) {
      throw new Error("Invalid cursor shape");
    }

    return parsed;
  } catch {
    throw new Error("Invalid pagination cursor");
  }
}
