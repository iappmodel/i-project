import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpOtpAuthUrl(input: {
  issuer: string;
  accountName: string;
  secret: string;
}) {
  return generateURI({
    strategy: "totp",
    issuer: input.issuer,
    label: input.accountName,
    secret: input.secret
  });
}

export async function buildTotpQrCodeDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpCode(input: {
  token: string;
  secret: string;
  window?: number;
}) {
  const result = verifySync({
    strategy: "totp",
    token: input.token,
    secret: input.secret,
    epochTolerance: (input.window ?? 1) * 30
  });

  return result.valid;
}

export function getCurrentTotpTimeStep() {
  return Math.floor(Date.now() / 1000 / 30);
}
