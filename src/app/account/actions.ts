"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/clients";
import { env } from "@/lib/env";

const requestSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
});

export interface PasswordResetResult {
  ok: boolean;
  message?: string;
}

const passwordSchema = z
  .string()
  .min(12, "Your password must be at least 12 characters long.")
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    message: "Your password must include at least one letter and one number.",
  });

function validateStrength(password: string, confirm: string): string | null {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid password.";
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

/**
 * Sends a password recovery link.
 *
 * The response is deliberately identical whether or not the account
 * exists, so the endpoint cannot be used to enumerate accounts.
 */
export async function requestPasswordResetAction(
  _prev: PasswordResetResult | null,
  formData: FormData
): Promise<PasswordResetResult> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createServerSupabaseClient();
  const redirectTo = `${env.server.appUrl()}/account/reset-password`;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  return {
    ok: true,
    message:
      "If an administrator account exists for that email address, a password reset link has been sent. Please check your inbox and your spam folder.",
  };
}

/**
 * Changes the signed-in user's own password and clears the
 * "must change password" flag.
 */
export async function changeOwnPasswordAction(
  _prev: PasswordResetResult | null,
  formData: FormData
): Promise<PasswordResetResult> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const error = validateStrength(password, confirmPassword);
  if (error) return { ok: false, message: error };

  if (!currentPassword) {
    return { ok: false, message: "Enter your current password." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  // Re-authenticate with the current password before changing it.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (reauthError) {
    return { ok: false, message: "Your current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { ok: false, message: "The password could not be changed. Please try again." };
  }

  const admin = await createAdminSupabaseClient();
  await admin
    .from("app_users")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  await logAuditEvent({
    action: "auth.password_changed",
    actor: { id: user.id, email: user.email },
    summary: { selfService: true },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?passwordChanged=1");
}

/**
 * Sets a new password from a recovery link (no current password needed).
 */
export async function updatePasswordAction(
  _prev: PasswordResetResult | null,
  formData: FormData
): Promise<PasswordResetResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const error = validateStrength(password, confirmPassword);
  if (error) return { ok: false, message: error };

  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return {
      ok: false,
      message:
        updateError.message === "Auth session missing"
          ? "Your reset link has expired. Please request a new one."
          : "The password could not be changed. Please try again.",
    };
  }

  let ip: string | null = null;
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
  } catch {
    ip = null;
  }

  await logAuditEvent({
    action: "auth.password_reset_completed",
    summary: { via: "recovery_link" },
    ipAddress: ip,
  });

  redirect("/dashboard?passwordUpdated=1");
}
