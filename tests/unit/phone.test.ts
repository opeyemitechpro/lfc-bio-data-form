import { describe, expect, it } from "vitest";

import {
  DEFAULT_COUNTRY_CODE,
  formatPhone,
  isNigerianMobile,
  isPlausiblePhone,
  normalizeEmail,
  normalizePhone,
} from "@/lib/phone";

describe("normalizePhone", () => {
  it("converts a local Nigerian mobile number to international form", () => {
    expect(normalizePhone("08012345678")).toBe("+2348012345678");
  });

  it("converts a 10-digit Nigerian mobile number", () => {
    expect(normalizePhone("8012345678")).toBe("+2348012345678");
  });

  it("keeps an already international number unchanged", () => {
    expect(normalizePhone("+2348012345678")).toBe("+2348012345678");
  });

  it("handles the 00234 international prefix", () => {
    expect(normalizePhone("002348012345678")).toBe("+2348012345678");
  });

  it("ignores spaces, dashes and brackets", () => {
    expect(normalizePhone("+234 (801) 234-5678")).toBe("+2348012345678");
    expect(normalizePhone("0801 234 5678")).toBe("+2348012345678");
  });

  it("preserves a non-Nigerian international number", () => {
    expect(normalizePhone("+14155552671")).toBe("+14155552671");
    expect(normalizePhone("+447700900123")).toBe("+447700900123");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
  });

  it("produces the same key for differently formatted versions of a number", () => {
    const a = normalizePhone("08012345678");
    const b = normalizePhone("+234 801 234 5678");
    const c = normalizePhone("8012345678");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("isNigerianMobile", () => {
  it("recognises Nigerian mobile prefixes", () => {
    expect(isNigerianMobile("+2348012345678")).toBe(true);
    expect(isNigerianMobile("+2347012345678")).toBe(true);
    expect(isNigerianMobile("+2349032345678")).toBe(true);
  });

  it("rejects non-Nigerian and landline numbers", () => {
    expect(isNigerianMobile("+14155552671")).toBe(false);
    expect(isNigerianMobile("+2341234567")).toBe(false);
  });
});

describe("isPlausiblePhone", () => {
  it("accepts reasonable lengths", () => {
    expect(isPlausiblePhone("+2348012345678")).toBe(true);
    expect(isPlausiblePhone("08012345678")).toBe(true);
  });

  it("rejects numbers that are too short or too long", () => {
    expect(isPlausiblePhone("12345")).toBe(false);
    expect(isPlausiblePhone("1234567890123456789")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("groups a Nigerian number for readability", () => {
    expect(formatPhone("+2348012345678")).toBe("+234 801 234 5678");
  });

  it("returns a dash for a missing number", () => {
    expect(formatPhone(null)).toBe("—");
    expect(formatPhone(undefined)).toBe("—");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  John.Example@Church.ORG ")).toBe(
      "john.example@church.org"
    );
  });

  it("returns an empty string for a missing value", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("DEFAULT_COUNTRY_CODE", () => {
  it("is Nigeria's country code", () => {
    expect(DEFAULT_COUNTRY_CODE).toBe("234");
  });
});
