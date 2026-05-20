/**
 * Base URL for the Alphabet Express API (no trailing slash).
 * Set in admin-console server env when proxying timeline requests.
 */
export function getAlphabetApiBaseUrl(): string | null {
  const raw = process.env.ALPHABET_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
