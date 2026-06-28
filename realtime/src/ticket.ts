// realtime チケットの検証（コンパニオン Worker 側）。
// 本体アプリ（src/server/lib/ticket.ts）が同じアルゴリズムで署名する。
// 形式: base64url(payloadJson) + "." + base64url(hmacSha256)
// payload: { personaId: string, exp: number(エポック秒) }
//
// このファイルは本体アプリと別ビルド単位なので意図的に独立コピー。
// 署名アルゴリズムを変える時は src/server/lib/ticket.ts と同時に変えること。

export type TicketPayload = {
  personaId: string;
  exp: number;
};

function base64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// チケットを検証する。無効・期限切れなら null。
export async function verifyTicket(
  ticket: string | null,
  secret: string | undefined,
): Promise<TicketPayload | null> {
  if (!ticket || !secret) return null;
  const dot = ticket.indexOf(".");
  if (dot < 0) return null;
  const payloadPart = ticket.slice(0, dot);
  const sigPart = ticket.slice(dot + 1);

  let expectedSig: ArrayBuffer;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    expectedSig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadPart),
    );
  } catch {
    return null;
  }

  let providedSig: Uint8Array;
  try {
    providedSig = base64urlDecode(sigPart);
  } catch {
    return null;
  }
  if (!timingSafeEqual(new Uint8Array(expectedSig), providedSig)) return null;

  let payload: TicketPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadPart)));
  } catch {
    return null;
  }
  if (typeof payload.personaId !== "string" || typeof payload.exp !== "number")
    return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
