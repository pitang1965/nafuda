import { describe, expect, it } from "vitest";
import { generateToken } from "./token";

describe("generateToken", () => {
  it("32文字の16進数を返し、毎回異なる", () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(generateToken()).not.toBe(a);
  });
});
