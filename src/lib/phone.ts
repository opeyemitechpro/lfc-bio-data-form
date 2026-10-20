/**
 * Phone-number normalisation.
 *
 * Nigeria uses the +234 country code. We keep the original display value
 * exactly as the member typed it, and store a normalised "digits only,
 * international" form for matching and duplicate detection.
 */

/** Default country code used when a local Nigerian number is supplied. */
export const DEFAULT_COUNTRY_CODE = "234";
export const DEFAULT_COUNTRY_PREFIX = "+234";

const NIGERIAN_MOBILE_PREFIXES = ["070", "080", "081", "090", "091", "0703"];

/**
 * Returns the digits of a phone number, or an empty string when there are
 * none. Keeps leading `+` so the caller can tell an international number
 * from a local one.
 */
export function digitsOnly(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

/**
 * Normalises a phone number to a canonical international form: `+2348012345678`.
 * Falls back to `+<digits>` for numbers that are not Nigerian.
 */
export function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // 00234... style international prefix
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Already international (starts with the country code and is long enough).
  if (hasPlus || digits.length > 11) {
    // Nigerian local number typed with the 0 trunk prefix, e.g. 0801...
    if (digits.startsWith("0") && digits.length === 11) {
      digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
    }
    return `+${digits}`;
  }

  // Local Nigerian number: 08012345678 -> +2348012345678
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  // 10-digit local number: 8012345678 -> +2348012345678
  if (digits.length === 10) {
    return `+${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  // 11 digits that do not start with 0 but look like a Nigerian mobile
  // (e.g. 8012345678 was handled above; 2348012345678 handled by length).
  if (digits.length === 13 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/** True when the number looks like a plausible Nigerian mobile number. */
export function isNigerianMobile(normalized: string): boolean {
  if (!normalized.startsWith(`+${DEFAULT_COUNTRY_CODE}`)) return false;
  const national = normalized.slice(`+${DEFAULT_COUNTRY_CODE}`.length);
  if (national.length !== 10) return false;
  return NIGERIAN_MOBILE_PREFIXES.some((prefix) => national.startsWith(prefix.replace(/^0/, "")));
}

/** True when the value contains at least 7 digits — a lenient sanity check. */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** Formats a normalised number for display: +234 801 234 5678 */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return "—";
  if (normalized.startsWith(`+${DEFAULT_COUNTRY_CODE}`)) {
    const national = normalized.slice(4);
    return `+234 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`.trim();
  }
  return normalized;
}

/** Normalises an email for matching purposes. */
export function normalizeEmail(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase();
}
