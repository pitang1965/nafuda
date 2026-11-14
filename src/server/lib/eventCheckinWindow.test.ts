import { describe, expect, it } from "vitest";
import {
  isValidConnectionContext,
  isWithinCheckinWindow,
} from "./eventCheckinWindow";

const min = 60 * 1000;
// 2026-12-25 19:00〜21:00 JST（= 10:00〜12:00Z）
const event = {
  eventDate: "2026-12-25T10:00:00Z",
  eventEndDate: "2026-12-25T12:00:00Z",
  showTime: true,
  timezone: "Asia/Tokyo",
};
const at = (iso: string, offsetMin = 0) =>
  new Date(new Date(iso).getTime() + offsetMin * min);

describe("isWithinCheckinWindow", () => {
  it("開始前は猶予(15分)より前なら拒否、猶予内なら受付", () => {
    expect(isWithinCheckinWindow(event, at(event.eventDate, -16))).toBe(false);
    expect(isWithinCheckinWindow(event, at(event.eventDate, -15))).toBe(true);
  });
  it("期間中は受付", () => {
    expect(isWithinCheckinWindow(event, at("2026-12-25T11:00:00Z"))).toBe(true);
  });
  it("終了後は猶予を過ぎたら拒否", () => {
    expect(isWithinCheckinWindow(event, at(event.eventEndDate, 15))).toBe(true);
    expect(isWithinCheckinWindow(event, at(event.eventEndDate, 16))).toBe(false);
  });
  it("時刻なし＋終了日ありは終了日の終わり(開催タイムゾーン)+猶予まで", () => {
    const allDay = { ...event, showTime: false };
    expect(isWithinCheckinWindow(allDay, at("2026-12-25T15:15:00Z"))).toBe(true);
    expect(isWithinCheckinWindow(allDay, at("2026-12-25T15:16:00Z"))).toBe(false);
  });
  it("終了未指定は開催タイムゾーンの開始日の終わり(+猶予)まで", () => {
    const noEnd = { ...event, eventEndDate: null };
    // JST 12/26 0:00 = 12/25 15:00Z
    expect(isWithinCheckinWindow(noEnd, at("2026-12-25T15:15:00Z"))).toBe(true);
    expect(isWithinCheckinWindow(noEnd, at("2026-12-25T15:16:00Z"))).toBe(false);
  });
});

describe("isValidConnectionContext", () => {
  const checkedInAt = "2026-12-01T00:00:00Z";
  it("企画イベントは開始前の交換に文脈を付けない", () => {
    const c = { ...event, isInstant: false, checkedInAt };
    expect(isValidConnectionContext(c, at(event.eventDate, -60))).toBe(false);
    expect(isValidConnectionContext(c, at(event.eventDate))).toBe(true);
  });
  it("即時イベントは1時間以内のチェックインだけ有効", () => {
    const c = { ...event, isInstant: true, checkedInAt };
    expect(isValidConnectionContext(c, at(checkedInAt, 60))).toBe(true);
    expect(isValidConnectionContext(c, at(checkedInAt, 61))).toBe(false);
  });
});
