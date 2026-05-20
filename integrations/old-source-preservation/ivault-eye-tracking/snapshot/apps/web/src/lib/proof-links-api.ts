export async function resolveProofLink(code: string, token: string) {
  const params = new URLSearchParams({ code, token });

  const res = await fetch(`/v1/proof-links/resolve?${params.toString()}`, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error("Failed to resolve proof link");
  }

  return res.json();
}
