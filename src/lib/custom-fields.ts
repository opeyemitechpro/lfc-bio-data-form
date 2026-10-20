import { z } from "zod";

import type { CustomFieldDefinition, CustomFieldType } from "@/lib/types";

/**
 * Validation of custom-field definitions and of submitted custom values.
 *
 * Definitions are validated with a strict allow-list of field types and
 * option shapes. No executable expression, script or code fragment is ever
 * stored or evaluated — options are plain strings, validation rules are
 * numeric bounds and a plain regular expression source string.
 */

export const customFieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "select",
  "multi_select",
  "checkbox",
  "date",
  "number",
  "email",
  "telephone",
  "yes_no",
]);

export const customFieldOptionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
});

const fieldKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers and underscores only.");

export const customFieldDefinitionSchema = z
  .object({
    field_key: fieldKeySchema,
    label: z.string().trim().min(1).max(120),
    field_type: customFieldTypeSchema,
    help_text: z.string().trim().max(400).nullish(),
    is_required: z.boolean().default(false),
    default_value: z.unknown().optional(),
    options: z.array(customFieldOptionSchema).max(60).default([]),
    validation: z
      .object({
        min_length: z.number().int().min(0).max(5000).optional(),
        max_length: z.number().int().min(1).max(5000).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().max(200).optional(),
      })
      .default({}),
    sort_order: z.number().int().min(0).max(10000).default(0),
    is_active: z.boolean().default(true),
    show_on_public_form: z.boolean().default(false),
    show_on_profile: z.boolean().default(true),
    show_on_card: z.boolean().default(false),
    show_in_table: z.boolean().default(false),
    show_in_export: z.boolean().default(false),
    is_sensitive: z.boolean().default(false),
    required_permission: z.string().trim().max(80).nullish(),
  })
  .superRefine((data, ctx) => {
    const needsOptions: CustomFieldType[] = ["select", "multi_select"];
    if (needsOptions.includes(data.field_type) && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "This field type requires at least one option.",
      });
    }
    if (data.field_type === "yes_no" && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Yes/No fields need Yes and No options.",
      });
    }
    if (data.validation.min !== undefined && data.validation.max !== undefined) {
      if (data.validation.min > data.validation.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validation", "min"],
          message: "Minimum cannot be greater than maximum.",
        });
      }
    }
    if (data.validation.min_length !== undefined && data.validation.max_length !== undefined) {
      if (data.validation.min_length > data.validation.max_length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validation", "min_length"],
          message: "Minimum length cannot be greater than maximum length.",
        });
      }
    }
  });

export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>;

/** Normalises the JSONB `options` column into a plain string list. */
export function readOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => {
      if (typeof option === "string") return option;
      if (option && typeof option === "object" && "value" in option) {
        const value = (option as { value: unknown }).value;
        return typeof value === "string" ? value : String(value ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

/** Normalises the JSONB `validation` column. */
export function readValidation(validation: unknown): CustomFieldDefinition["validation"] {
  if (!validation || typeof validation !== "object") return {};
  const raw = validation as Record<string, unknown>;
  const result: CustomFieldDefinition["validation"] = {};
  if (typeof raw.min_length === "number") result.min_length = raw.min_length;
  if (typeof raw.max_length === "number") result.max_length = raw.max_length;
  if (typeof raw.min === "number") result.min = raw.min;
  if (typeof raw.max === "number") result.max = raw.max;
  if (typeof raw.pattern === "string") result.pattern = raw.pattern;
  return result;
}

/**
 * Validates a single submitted value against its field definition.
 * Returns an error message, or null when the value is acceptable.
 */
export function validateCustomValue(
  field: CustomFieldDefinition,
  rawValue: unknown
): string | null {
  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    rawValue === "" ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (isEmpty) {
    return field.is_required ? `${field.label} is required.` : null;
  }

  switch (field.field_type) {
    case "short_text":
    case "long_text": {
      const value = String(rawValue);
      if (value.length > 5000) return `${field.label} is too long.`;
      const { min_length, max_length, pattern } = field.validation;
      if (min_length !== undefined && value.length < min_length) {
        return `${field.label} must be at least ${min_length} characters.`;
      }
      if (max_length !== undefined && value.length > max_length) {
        return `${field.label} must be at most ${max_length} characters.`;
      }
      if (pattern) {
        try {
          const regex = new RegExp(pattern);
          if (!regex.test(value)) return `${field.label} has an invalid format.`;
        } catch {
          // An invalid stored pattern must never break the form.
          return null;
        }
      }
      return null;
    }
    case "select": {
      const value = String(rawValue);
      const options = field.options.length > 0 ? field.options : readOptions([]);
      if (options.length > 0 && !options.includes(value)) {
        return `${field.label} has an invalid selection.`;
      }
      return null;
    }
    case "multi_select": {
      if (!Array.isArray(rawValue)) return `${field.label} must be a list.`;
      const options = field.options;
      for (const item of rawValue) {
        if (typeof item !== "string") return `${field.label} has an invalid selection.`;
        if (options.length > 0 && !options.includes(item)) {
          return `${field.label} has an invalid selection.`;
        }
      }
      return null;
    }
    case "checkbox":
    case "yes_no": {
      if (typeof rawValue === "boolean") return null;
      if (rawValue === "true" || rawValue === "false") return null;
      return `${field.label} has an invalid value.`;
    }
    case "number": {
      const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (!Number.isFinite(value)) return `${field.label} must be a number.`;
      const { min, max } = field.validation;
      if (min !== undefined && value < min) return `${field.label} must be ${min} or more.`;
      if (max !== undefined && value > max) return `${field.label} must be ${max} or less.`;
      return null;
    }
    case "email": {
      const value = String(rawValue);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "Enter a valid email address.";
      }
      return null;
    }
    case "telephone": {
      const value = String(rawValue);
      if (value.replace(/\D/g, "").length < 7) {
        return "Enter a valid phone number.";
      }
      return null;
    }
    case "date": {
      const value = String(rawValue);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${field.label} must be a valid date.`;
      if (Number.isNaN(new Date(value).getTime())) return `${field.label} must be a valid date.`;
      return null;
    }
    default:
      return null;
  }
}

/** Validates the whole custom-value payload for a member. */
export function validateCustomValues(
  fields: CustomFieldDefinition[],
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const error = validateCustomValue(field, values[field.field_key]);
    if (error) errors[field.field_key] = error;
  }
  return errors;
}
