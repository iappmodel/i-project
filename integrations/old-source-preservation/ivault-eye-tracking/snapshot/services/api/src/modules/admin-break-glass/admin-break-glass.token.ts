import crypto from "node:crypto";

export function generateBreakGlassToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashBreakGlassToken(input: {
  token: string;
}) {
  const pepper = process.env.ADMIN_BREAK_GLASS_TOKEN_PEPPER;

  if (!pepper) {
    throw new Error("ADMIN_BREAK_GLASS_TOKEN_PEPPER is not configured");
  }

  return crypto
    .createHash("sha256")
    .update(`${input.token}.${pepper}`)
    .digest("hex");
}
