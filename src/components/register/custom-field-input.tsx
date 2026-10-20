"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type { CustomFieldDefinition } from "@/lib/types";

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  idPrefix?: string;
}

/** Renders the correct control for a database-driven custom field. */
export function CustomFieldInput({
  field,
  value,
  onChange,
  error,
  idPrefix = "custom",
}: CustomFieldInputProps) {
  const id = `${idPrefix}-${field.field_key}`;
  const required = field.is_required;

  const common = {
    id,
    invalid: Boolean(error),
    "aria-describedby": error ? `${id}-error` : field.help_text ? `${id}-help` : undefined,
    "aria-required": required || undefined,
  };

  switch (field.field_type) {
    case "long_text":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Textarea
            {...common}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
      );

    case "select":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => onChange(next)}
          >
            <SelectTrigger id={id} aria-invalid={Boolean(error) || undefined}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      );

    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <fieldset
            className="space-y-2.5 rounded-lg border-2 border-input bg-background p-4"
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <legend className="sr-only">{field.label}</legend>
            {field.options.map((option) => {
              const optionId = `${id}-${option.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <div key={option} className="flex items-center gap-3">
                  <Checkbox
                    id={optionId}
                    checked={selected.includes(option)}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked
                          ? [...selected, option]
                          : selected.filter((item) => item !== option)
                      )
                    }
                  />
                  <label
                    htmlFor={optionId}
                    className="cursor-pointer text-base leading-snug"
                  >
                    {option}
                  </label>
                </div>
              );
            })}
          </fieldset>
        </FormField>
      );
    }

    case "checkbox":
    case "yes_no": {
      const checked = value === true || value === "true";
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(next) => onChange(next === true)}
              aria-required={required || undefined}
            />
            <label htmlFor={id} className="cursor-pointer text-base font-semibold leading-snug">
              {field.label}
              {required ? <span className="ml-1 text-destructive">*</span> : null}
            </label>
          </div>
          {field.help_text ? (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          ) : null}
          {error ? (
            <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      );
    }

    case "number":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Input
            {...common}
            type="number"
            inputMode="decimal"
            value={value === null || value === undefined ? "" : String(value)}
            min={field.validation.min}
            max={field.validation.max}
            onChange={(event) =>
              onChange(event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </FormField>
      );

    case "date":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Input
            {...common}
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value || null)}
          />
        </FormField>
      );

    case "email":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Input
            {...common}
            type="email"
            autoComplete="email"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
      );

    case "telephone":
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Input
            {...common}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+234 801 234 5678"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
      );

    default:
      return (
        <FormField
          id={id}
          label={field.label}
          required={required}
          helpText={field.help_text}
          error={error}
        >
          <Input
            {...common}
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </FormField>
      );
  }
}
