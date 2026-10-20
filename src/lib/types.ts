/** Shared domain types for the membership application. */

export const AGE_CATEGORIES = ["child", "youth", "adult"] as const;
export type AgeCategory = (typeof AGE_CATEGORIES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const MEMBERSHIP_DURATIONS = [
  "lt_1y",
  "y1_3",
  "y4_6",
  "y7_10",
  "gt_10y",
] as const;
export type MembershipDuration = (typeof MEMBERSHIP_DURATIONS)[number];

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  child: "Child (1–10 years)",
  youth: "Youth (11–20 years)",
  adult: "Adult (21 years and above)",
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
};

export const MEMBERSHIP_DURATION_LABELS: Record<MembershipDuration, string> = {
  lt_1y: "Less than 1 year",
  y1_3: "1–3 years",
  y4_6: "4–6 years",
  y7_10: "7–10 years",
  gt_10y: "Over 10 years",
};

export const NO_SERVICE_UNITS_OPTION = "__none__";

export type CustomFieldType =
  | "short_text"
  | "long_text"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "number"
  | "email"
  | "telephone"
  | "yes_no";

export interface CustomFieldDefinition {
  id: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  help_text: string | null;
  is_required: boolean;
  default_value: unknown;
  options: string[];
  validation: {
    min_length?: number;
    max_length?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  sort_order: number;
  is_active: boolean;
  show_on_public_form: boolean;
  show_on_profile: boolean;
  show_on_card: boolean;
  show_in_table: boolean;
  show_in_export: boolean;
  is_sensitive: boolean;
  required_permission: string | null;
}

export interface TitleOption {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

export interface ServiceUnitOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string | null;
  category: string;
  sort_order: number;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count?: number;
  permission_keys?: string[];
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  status: "active" | "suspended";
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  role_ids?: string[];
  role_names?: string[];
  service_unit_scope_ids?: string[];
}

/** The authenticated principal, resolved on the server. */
export interface AuthContext {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  permissions: Set<string>;
  roleIds: string[];
  roleNames: string[];
  serviceUnitScopeIds: string[] | null;
  mustChangePassword: boolean;
}

export interface MemberPhone {
  id: string;
  phone: string;
  phone_normalized: string;
  label: "primary" | "whatsapp" | "other";
  is_primary: boolean;
}

export interface MemberRecord {
  id: string;
  reference_no: string;
  full_name: string;
  title_id: string | null;
  title_name: string | null;
  gender: Gender;
  age_category: AgeCategory;
  birth_day: number | null;
  birth_month: number | null;
  primary_phone: string;
  primary_phone_normalized: string;
  whatsapp_same_as_primary: boolean;
  whatsapp_phone: string | null;
  email: string | null;
  residential_address: string | null;
  membership_duration: MembershipDuration;
  suggestions: string | null;
  photo_public_id: string | null;
  photo_format: string | null;
  photo_width: number | null;
  photo_height: number | null;
  photo_bytes: number | null;
  status: "active" | "deleted";
  registration_source: "public_form" | "admin";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deletion_reason: string | null;
  service_units: { id: string; name: string; slug: string }[];
  phones: MemberPhone[];
  custom_values: Record<string, unknown>;
  consent: {
    notice_version: string;
    consented_at: string;
    status: string;
    is_child_registration: boolean;
    guardian_name: string | null;
  } | null;
}

export interface MemberListItem {
  id: string;
  reference_no: string;
  full_name: string;
  title_name: string | null;
  gender: Gender;
  age_category: AgeCategory;
  primary_phone: string;
  whatsapp_same_as_primary: boolean;
  whatsapp_phone: string | null;
  email: string | null;
  membership_duration: MembershipDuration;
  photo_public_id: string | null;
  created_at: string;
  service_units: { id: string; name: string }[];
  custom_values?: Record<string, unknown>;
}

export interface DuplicateFlag {
  id: string;
  member_a_id: string;
  member_b_id: string;
  match_reason: string;
  match_score: number;
  status: "pending" | "confirmed" | "distinct" | "resolved";
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  member_a?: MemberRecord;
  member_b?: MemberRecord;
}

export interface AuditEvent {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_ref: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface FormSettings {
  requireAddress: boolean;
  maxUploadBytes: number;
  acceptsChildren: boolean;
  requireGuardianConsent: boolean;
  allowAdditionalPhones: boolean;
  allowSuggestions: boolean;
  successMessage: string;
}

export interface PrivacyNotice {
  version: string;
  updatedAt: string;
  contactEmail: string;
  contactPhone: string;
  retentionYears: number;
  organisation: string;
  thirdParties: string[];
}
