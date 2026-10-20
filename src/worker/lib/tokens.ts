export const PAIRING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const PAIRING_LENGTH = 8;
// 31 symbols; largest multiple of 31 below 256 is 248. Bytes >= 248 are discarded (no modulo bias).
const REJECT_FROM = 248;

export function randomBase64Url(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generatePairingCode(): string {
  let out = "";
  const buf = new Uint8Array(16);
  while (out.length < PAIRING_LENGTH) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= REJECT_FROM) continue;
      out += PAIRING_ALPHABET[b % PAIRING_ALPHABET.length];
      if (out.length === PAIRING_LENGTH) break;
    }
  }
  return out;
}

export function normalizePairingCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[-\s]/g, "");
  if (code.length !== PAIRING_LENGTH) return null;
  for (const ch of code) if (!PAIRING_ALPHABET.includes(ch)) return null;
  return code;
}

export function formatPairingCode(code8: string): string {
  return `${code8.slice(0, 4)}-${code8.slice(4)}`;
}
