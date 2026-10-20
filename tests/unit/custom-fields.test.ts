import { describe, expect, it } from "vitest";

import {
  customFieldDefinitionSchema,
  readOptions,
  readValidation,
  validateCustomValue,
  validateCustomValues,
} from "@/lib/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

function field(overrides: Partial<CustomFieldDefinition> = {}): CustomFieldDefinition {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    field_key: "test_field",
    label: "Test field",
    field_type: "short_text",
    help_text: null,
    is_required: false,
    default_value: null,
    options: [],
    validation: {},
    sort_order: 0,
    is_active: true,
    show_on_public_form: false,
    show_on_profile: true,
    show_on_card: false,
    show_in_table: false,
    show_in_export: false,
    is_sensitive: false,
    required_permission: null,
    ...overrides,
  };
}

describe("customFieldDefinitionSchema", () => {
  it("accepts a valid definition", () => {
    const result = customFieldDefinitionSchema.safeParse({
      field_key: "baptism_year",
      label: "Baptism Year",
      field_type: "number",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a field key with uppercase letters", () => {
    const result = customFieldDefinitionSchema.safeParse({
      field_key: "BaptismYear",
      label: "Baptism Year",
      field_type: "number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a field key containing a script injection attempt", () => {
    const result = customFieldDefinitionSchema.safeParse({
      field_key: "alert(1)",
      label: "Bad",
      field_type: "short_text",
    });
    expect(result.success).toBe(false);
  });

  it("requires options for a select field", () => {
    const result = customFieldDefinitionSchema.safeParse({
      field_key: "choice",
      label: "Choice",
      field_type: "select",
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a minimum greater than a maximum", () => {
    const result = customFieldDefinitionSchema.safeParse({
      field_key: "sized",
      label: "Sized",
      field_type: "short_text",
      validation: { min_length: 10, max_length: 5 },
    });
    expect(result.success).toBe(false);
  });
});

describe("readOptions", () => {
  it("reads plain string options", () => {
    expect(readOptions(["a", "b"])).toEqual(["a", "b"]);
  });

  it("reads label/value objects", () => {
    expect(readOptions([{ label: "Yes", value: "yes" }])).toEqual(["yes"]);
  });

  it("returns an empty list for a non-array", () => {
    expect(readOptions(null)).toEqual([]);
    expect(readOptions({})).toEqual([]);
  });
});

describe("readValidation", () => {
  it("keeps only the recognised numeric rules", () => {
    expect(
      readValidation({ min_length: 2, max_length: 5, min: 1, max: 9, pattern: "^a" })
    ).toEqual({ min_length: 2, max_length: 5, min: 1, max: 9, pattern: "^a" });
  });

  it("drops unknown or malformed rules", () => {
    expect(readValidation({ min_length: "two", evil: true })).toEqual({});
  });
});

describe("validateCustomValue", () => {
  it("reports a missing required value", () => {
    const result = validateCustomValue(field({ is_required: true }), "");
    expect(result).toMatch(/required/i);
  });

  it("accepts an empty optional value", () => {
    expect(validateCustomValue(field(), "")).toBeNull();
  });

  it("enforces the minimum length", () => {
    const result = validateCustomValue(
      field({ validation: { min_length: 3 } }),
      "ab"
    );
    expect(result).toMatch(/at least 3/i);
  });

  it("enforces the maximum length", () => {
    const result = validateCustomValue(
      field({ validation: { max_length: 3 } }),
      "abcd"
    );
    expect(result).toMatch(/at most 3/i);
  });

  it("validates a number within its bounds", () => {
    expect(validateCustomValue(field({ field_type: "number" }), 5)).toBeNull();
    expect(
      validateCustomValue(field({ field_type: "number", validation: { min: 10 } }), 5)
    ).toMatch(/10 or more/i);
  });

  it("rejects a non-numeric value for a number field", () => {
    expect(validateCustomValue(field({ field_type: "number" }), "abc")).toMatch(
      /must be a number/i
    );
  });

  it("validates an email address", () => {
    expect(validateCustomValue(field({ field_type: "email" }), "a@b.co")).toBeNull();
    expect(validateCustomValue(field({ field_type: "email" }), "nope")).toMatch(
      /valid email/i
    );
  });

  it("rejects a select value that is not an option", () => {
    const result = validateCustomValue(
      field({ field_type: "select", options: ["a", "b"] }),
      "c"
    );
    expect(result).toMatch(/invalid selection/i);
  });

  it("accepts a valid select value", () => {
    expect(
      validateCustomValue(field({ field_type: "select", options: ["a", "b"] }), "a")
    ).toBeNull();
  });

  it("validates a multi-select list", () => {
    expect(
      validateCustomValue(
        field({ field_type: "multi_select", options: ["a", "b"] }),
        ["a", "b"]
      )
    ).toBeNull();
    expect(
      validateCustomValue(
        field({ field_type: "multi_select", options: ["a", "b"] }),
        ["z"]
      )
    ).toMatch(/invalid selection/i);
  });

  it("accepts a boolean for a yes/no field", () => {
    expect(validateCustomValue(field({ field_type: "yes_no" }), true)).toBeNull();
    expect(validateCustomValue(field({ field_type: "yes_no" }), "maybe")).toMatch(
      /invalid value/i
    );
  });

  it("validates a date in ISO format", () => {
    expect(validateCustomValue(field({ field_type: "date" }), "2026-01-15")).toBeNull();
    expect(validateCustomValue(field({ field_type: "date" }), "15/01/2026")).toMatch(
      /valid date/i
    );
  });

  it("does not break when a stored pattern is invalid", () => {
    const result = validateCustomValue(
      field({ validation: { pattern: "([unclosed" } }),
      "anything"
    );
    expect(result).toBeNull();
  });
});

describe("validateCustomValues", () => {
  it("collects the errors for every field", () => {
    const errors = validateCustomValues(
      [
        field({ field_key: "a", is_required: true }),
        field({ field_key: "b", field_type: "email" }),
      ],
      { a: "", b: "bad" }
    );
    expect(Object.keys(errors).sort()).toEqual(["a", "b"]);
  });

  it("returns no errors when everything is valid", () => {
    expect(
      validateCustomValues([field({ field_key: "a" })], { a: "value" })
    ).toEqual({});
  });
});
