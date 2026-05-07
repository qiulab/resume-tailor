import { describe, expect, it } from "vitest";
import { computeHonestATSScore } from "./analysisService";

describe("computeHonestATSScore (unit)", () => {
  it("caps score at 88 maximum", () => {
    const { score } = computeHonestATSScore(
      Array(50).fill("keyword"),
      [],
      { keywordMatch: 100, skillsCoverage: 100, formatSignals: 100 }
    );
    expect(score).toBeLessThanOrEqual(88);
  });

  it("returns Low Match for very low keyword coverage", () => {
    const { label } = computeHonestATSScore(
      ["one"],
      Array(20).fill("missing"),
      { keywordMatch: 5, skillsCoverage: 10, formatSignals: 50 }
    );
    expect(label).toBe("Low Match");
  });

  it("returns Strong Match for high coverage", () => {
    const { label } = computeHonestATSScore(
      Array(15).fill("keyword"),
      Array(2).fill("missing"),
      { keywordMatch: 88, skillsCoverage: 85, formatSignals: 90 }
    );
    expect(label).toBe("Strong Match");
  });

  it("returns Moderate Match for medium coverage", () => {
    const { label } = computeHonestATSScore(
      Array(5).fill("keyword"),
      Array(5).fill("missing"),
      { keywordMatch: 55, skillsCoverage: 50, formatSignals: 70 }
    );
    expect(label).toBe("Moderate Match");
  });

  it("always includes a disclaimer mentioning keyword-match estimate", () => {
    const { disclaimer } = computeHonestATSScore(
      [],
      [],
      { keywordMatch: 0, skillsCoverage: 0, formatSignals: 0 }
    );
    expect(disclaimer.length).toBeGreaterThan(50);
    expect(disclaimer).toContain("keyword-match estimate");
  });

  it("score is 0 when no keywords match", () => {
    const { score } = computeHonestATSScore(
      [],
      Array(10).fill("missing"),
      { keywordMatch: 0, skillsCoverage: 0, formatSignals: 0 }
    );
    expect(score).toBe(0);
  });
});
