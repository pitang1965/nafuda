import { describe, expect, it } from "vitest";
import { zonedEndOfDay, zonedWallClockToUtc } from "./timezone";

const at = (iso: string) => new Date(iso);

describe("timezone (夏時間の境界: America/New_York 2026-03-08 / 11-01)", () => {
  const ny = "America/New_York";
  it("壁時計→UTCが夏時間前後のオフセットを反映する", () => {
    expect(zonedWallClockToUtc("2026-03-07", "12:00", ny).toISOString()).toBe(
      "2026-03-07T17:00:00.000Z",
    );
    expect(zonedWallClockToUtc("2026-03-08", "12:00", ny).toISOString()).toBe(
      "2026-03-08T16:00:00.000Z",
    );
  });
  it("翌日0:00を境界日のオフセットで返す", () => {
    expect(zonedEndOfDay(at("2026-03-07T17:00:00Z"), ny).toISOString()).toBe(
      "2026-03-08T05:00:00.000Z",
    );
    expect(zonedEndOfDay(at("2026-03-08T16:00:00Z"), ny).toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
    expect(zonedEndOfDay(at("2026-10-31T16:00:00Z"), ny).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
    expect(zonedEndOfDay(at("2026-11-01T17:00:00Z"), ny).toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
  });
});
