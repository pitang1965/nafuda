// realtime チケットの署名（本体アプリ側）。コンパニオン Worker（realtime/src/ticket.ts）が
// 同じアルゴリズムで検証する。形式: base64url(payloadJson) + "." + base64url(hmacSha256)。
// 署名アルゴリズムを変える時は realtime/src/ticket.ts と同時に変えること。
//
// 用途: クライアントが WebSocket 接続する直前に server fn（issueRealtimeTicket）が短命トークン
// を発行する。コンパニオン Worker は共有シークレットで署名検証するだけで DB に触れず本人性を確定する。

export type TicketPayload = {
  personaId: string;
  exp: number; // エポック秒
};

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 指定ペルソナ宛の短命チケット（既定60秒）を署名して返す。
export async function signTicket(
  personaId: string,
  secret: string,
  ttlSeconds = 60,
): Promise<string> {
  const payload: TicketPayload = {
    personaId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadPart = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadPart),
  );
  return `${payloadPart}.${base64urlEncode(new Uint8Array(sig))}`;
}
