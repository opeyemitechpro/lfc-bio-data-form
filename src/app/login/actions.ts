"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { createServerSupabaseClient } from "@/lib/supabase/clients";
import { getAuthContext } from "@/lib/auth/permissions";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export interface LoginResult {
  ok: boolean;
  message?: string;
}

export async function signInAction(
  _prev: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  let ip: string | null = null;
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
  } catch {
    ip = null;
  }

  if (error) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      summary: { email },
      ipAddress: ip,
    });
    // A generic message: never reveal whether the account exists.
    return {
      ok: false,
      message: "The email address or password is incorrect.",
    };
  }

  // Confirm the account is an authorised, active application user.
  const context = await getAuthContext();
  if (!context) {
    await supabase.auth.signOut();
    await logAuditEvent({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      summary: { email, reason: "not_provisioned" },
      ipAddress: ip,
    });
    return {
      ok: false,
      message:
        "This account is not enabled for the administration dashboard. Please contact the superadmin.",
    };
  }

  await logAuditEvent({
    action: AUDIT_ACTIONS.LOGIN_SUCCEEDED,
    actor: { id: context.userId, email: context.email },
    summary: { email },
    ipAddress: ip,
  });

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
