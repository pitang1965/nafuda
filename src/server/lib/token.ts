// 推測不能な 128bit のランダムトークン（hex 32文字）。共有URL・QR・招待で使う
export function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
