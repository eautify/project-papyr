import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  calculateStreak,
  categoryFromSubjects,
  clampProgress,
  normalizeIsbn,
} from "./domain";

describe("book catalog domain helpers", () => {
  it("calculates page progress and handles invalid page counts", () => {
    expect(calculateProgress(200, 400)).toBe(50);
    expect(calculateProgress(500, 400)).toBe(100);
    expect(calculateProgress(-8, 400)).toBe(0);
    expect(calculateProgress(20, null)).toBeNull();
  });

  it("clamps direct percentage edits", () => {
    expect(clampProgress(-2)).toBe(0);
    expect(clampProgress(46.5)).toBe(46.5);
    expect(clampProgress(104)).toBe(100);
    expect(clampProgress(Number.NaN)).toBe(0);
  });

  it("normalizes ISBN-10 and ISBN-13 input without accepting other shapes", () => {
    expect(normalizeIsbn("978-0-525-55947-4")).toBe("9780525559474");
    expect(normalizeIsbn("0-545-01022-5")).toBe("0545010225");
    expect(normalizeIsbn("978-not-an-isbn")).toBeNull();
    expect(normalizeIsbn("1234")).toBeNull();
  });

  it("uses a labeled approximation for book subjects", () => {
    expect(categoryFromSubjects(["Fantasy fiction", "Magic"])).toBe("Fantasy");
    expect(categoryFromSubjects(["World history"])).toBe("History");
    expect(categoryFromSubjects([])).toBe("Other topics");
  });

  it("counts only consecutive logged activity days, including a streak through yesterday", () => {
    expect(
      calculateStreak(["2026-10-04", "2026-10-05", "2026-10-02"], "2026-10-05"),
    ).toBe(2);
    expect(calculateStreak(["2026-10-04", "2026-10-05"], "2026-10-06")).toBe(2);
    expect(calculateStreak(["2026-10-01"], "2026-10-06")).toBe(0);
  });
});
