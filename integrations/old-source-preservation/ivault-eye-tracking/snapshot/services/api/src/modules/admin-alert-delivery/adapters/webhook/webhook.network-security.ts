import dns from "node:dns/promises";
import net from "node:net";

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .map(Number)
    .reduce((acc, octet) => ((acc << 8) + octet) >>> 0, 0);
}

function ipv4InRange(ip: string, cidrBase: string, bits: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(cidrBase);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;

  return (ipInt & mask) === (baseInt & mask);
}

function isPrivateIpv4(ip: string): boolean {
  return (
    ipv4InRange(ip, "10.0.0.0", 8) ||
    ipv4InRange(ip, "172.16.0.0", 12) ||
    ipv4InRange(ip, "192.168.0.0", 16) ||
    ipv4InRange(ip, "127.0.0.0", 8) ||
    ipv4InRange(ip, "169.254.0.0", 16) ||
    ipv4InRange(ip, "0.0.0.0", 8) ||
    ipv4InRange(ip, "100.64.0.0", 10)
  );
}

function isUnsafeIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized === "::" ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function assertPublicIpAddress(ip: string) {
  const version = net.isIP(ip);

  if (version === 4 && isPrivateIpv4(ip)) {
    throw new Error("webhook target resolves to private IPv4 address");
  }

  if (version === 6 && isUnsafeIpv6(ip)) {
    throw new Error("webhook target resolves to private IPv6 address");
  }

  if (version === 0) {
    throw new Error("invalid resolved IP address");
  }
}

export async function assertWebhookHostResolvesPublicly(hostname: string) {
  const records = await dns.lookup(hostname, {
    all: true,
    verbatim: true
  });

  if (records.length === 0) {
    throw new Error("webhook target host did not resolve");
  }

  for (const record of records) {
    assertPublicIpAddress(record.address);
  }
}
