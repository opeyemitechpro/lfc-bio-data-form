import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import type { FormSettings, PrivacyNotice } from "@/lib/types";

const DEFAULT_FORM_SETTINGS: FormSettings = {
  requireAddress: true,
  maxUploadBytes: 5 * 1024 * 1024,
  acceptsChildren: true,
  requireGuardianConsent: true,
  allowAdditionalPhones: true,
  allowSuggestions: true,
  successMessage:
    "Thank you. Your registration has been received and recorded by the church.",
};

const DEFAULT_PRIVACY_NOTICE: PrivacyNotice = {
  version: "1.0",
  updatedAt: "2026-01-01",
  contactEmail: "lfc.laderin@example.org",
  contactPhone: "+234",
  retentionYears: 7,
  organisation: "Living Faith Church International — Laderin-Hilltop",
  thirdParties: [
    "Supabase (hosting, database and authentication)",
    "Vercel (application hosting)",
    "Cloudinary (photograph storage and delivery)",
  ],
};

export async function getFormSettings(): Promise<FormSettings> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "form_settings")
    .maybeSingle();

  if (!data) return DEFAULT_FORM_SETTINGS;
  const value = (data.value ?? {}) as Partial<FormSettings>;
  return { ...DEFAULT_FORM_SETTINGS, ...value };
}

export async function getPrivacyNotice(): Promise<PrivacyNotice> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "privacy_notice")
    .maybeSingle();

  if (!data) return DEFAULT_PRIVACY_NOTICE;
  const value = (data.value ?? {}) as Partial<PrivacyNotice>;
  return { ...DEFAULT_PRIVACY_NOTICE, ...value };
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data) return fallback;
  return (data.value ?? fallback) as T;
}

export async function updateSetting(
  key: string,
  value: unknown,
  updatedBy?: string
): Promise<void> {
  const admin = await createAdminSupabaseClient();
  await admin
    .from("app_settings")
    .upsert(
      { key, value: value as never, updated_by: updatedBy ?? null, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
}
