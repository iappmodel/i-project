export async function createProofPortalSession(privateRoomKey: string) {
  const res = await fetch(
    `/v1/customer-trust-proof-portal/private-room/${privateRoomKey}/session`,
    {
      method: "POST",
      credentials: "include"
    }
  );

  if (!res.ok) throw new Error("Failed to create proof portal session");
  return res.json();
}

export async function getProofDashboard(portalToken: string) {
  const res = await fetch("/v1/customer-trust-proof-portal/dashboard", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portalToken })
  });

  if (!res.ok) throw new Error("Failed to load proof dashboard");
  return res.json();
}

export async function listProofArtifacts(portalToken: string, limit = 50) {
  const res = await fetch("/v1/customer-trust-proof-portal/artifacts", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portalToken, limit })
  });

  if (!res.ok) throw new Error("Failed to load proof artifacts");
  return res.json();
}

export async function listProofTimeline(portalToken: string, limit = 50) {
  const res = await fetch("/v1/customer-trust-proof-portal/timeline", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portalToken, limit })
  });

  if (!res.ok) throw new Error("Failed to load proof timeline");
  return res.json();
}

export async function getProofCryptoStatus(portalToken: string) {
  const res = await fetch("/v1/customer-trust-proof-portal/crypto-status", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portalToken })
  });

  if (!res.ok) throw new Error("Failed to load proof crypto status");
  return res.json();
}
