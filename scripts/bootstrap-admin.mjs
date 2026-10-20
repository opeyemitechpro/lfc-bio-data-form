#!/usr/bin/env node
/**
 * =====================================================================
 * Living Faith Church International — Laderin-Hilltop
 * Secure superadmin bootstrap
 * =====================================================================
 *
 * Creates the initial superadmin principal.
 *
 * Usage:
 *   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... \
 *   node scripts/bootstrap-admin.mjs
 *
 * Requirements:
 *   * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *     (in .env.local, or exported in the shell).
 *   * Migrations must have been applied already (see README).
 *   * BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters and contain
 *     at least one letter and one number.
 *
 * Safety properties:
 *   * Idempotent — running it again will not create a duplicate account.
 *   * No credentials are hard-coded and no password is ever printed.
 *   * The account is flagged `must_change_password`, so the temporary
 *     password cannot be used beyond the first sign-in.
 *   * The superadmin principal lives in a table that the application's
 *     ordinary role and user management code never reads or writes.
 *
 * Recovery: if the superadmin loses access, run this script again with
 * the same email to re-grant the principal to a new Auth identity. See
 * the README section "Superadmin recovery".
 * =====================================================================
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

/** Loads .env.local / .env into process.env without overriding real values. */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(projectRoot, name);
    if (!existsSync(path)) continue;

    const content = readFileSync(path, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator === -1) continue;

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.BOOTSTRAP_ADMIN_NAME || "Superadmin";
const ADMIN_ROLES = (process.env.BOOTSTRAP_ADMIN_ROLES || "Resident Pastor")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function fail(message) {
  console.error(`\n[bootstrap] ERROR: ${message}\n`);
  process.exit(1);
}

function validate() {
  if (!SUPABASE_URL) fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is not set.");
  if (!ADMIN_EMAIL) fail("BOOTSTRAP_ADMIN_EMAIL is not set.");
  if (!ADMIN_PASSWORD) fail("BOOTSTRAP_ADMIN_PASSWORD is not set.");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ADMIN_EMAIL)) {
    fail("BOOTSTRAP_ADMIN_EMAIL is not a valid email address.");
  }

  if (ADMIN_PASSWORD.length < 12) {
    fail("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters long.");
  }
  if (!/[A-Za-z]/.test(ADMIN_PASSWORD) || !/[0-9]/.test(ADMIN_PASSWORD)) {
    fail(
      "BOOTSTRAP_ADMIN_PASSWORD must include at least one letter and one number."
    );
  }
}

validate();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(email) {
  // The admin API does not offer an email filter, so we page through the
  // small user list. This runs once during provisioning.
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) fail(`Could not list auth users: ${error.message}`);

  const match = (data?.users ?? []).find(
    (user) => (user.email ?? "").toLowerCase() === email.toLowerCase()
  );

  return match ?? null;
}

async function main() {
  console.log("\n[bootstrap] Living Faith Church International — Laderin-Hilltop");
  console.log("[bootstrap] Provisioning the superadmin principal…\n");

  const email = ADMIN_EMAIL.toLowerCase();

  // 1. Find or create the Supabase Auth identity.
  let authUser = await findAuthUserByEmail(email);
  let createdAuthUser = false;

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME },
    });

    if (error) fail(`Could not create the auth user: ${error.message}`);

    authUser = data.user;
    createdAuthUser = true;
    console.log("[bootstrap] Created a new authentication identity.");
  } else {
    console.log(
      "[bootstrap] An authentication identity for this email already exists — reusing it."
    );
  }

  const userId = authUser.id;

  // 2. Create or update the application user profile.
  const { data: existingProfile, error: profileError } = await supabase
    .from("app_users")
    .select("id, must_change_password, status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) fail(`Could not read the app_users row: ${profileError.message}`);

  if (existingProfile) {
    const { error } = await supabase
      .from("app_users")
      .update({
        email,
        full_name: ADMIN_NAME,
        is_active: true,
        status: "active",
        // Re-enforcing the forced password change keeps recovery safe.
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) fail(`Could not update the app_users row: ${error.message}`);
    console.log("[bootstrap] Updated the existing administrator profile.");
  } else {
    const { error } = await supabase.from("app_users").insert({
      id: userId,
      email,
      full_name: ADMIN_NAME,
      is_active: true,
      status: "active",
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) fail(`Could not create the app_users row: ${error.message}`);
    console.log("[bootstrap] Created the administrator profile.");
  }

  // 3. Grant the hidden superadmin principal.
  const { error: principalError } = await supabase.rpc(
    "grant_superadmin_principal",
    { p_user_id: userId, p_created_by: null }
  );

  if (principalError) {
    fail(
      `Could not grant the superadmin principal: ${principalError.message}\n` +
        "Make sure migration 004 has been applied to the database."
    );
  }
  console.log("[bootstrap] Granted the hidden superadmin principal.");

  // 4. Assign the requested operational roles.
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, name")
    .in("name", ADMIN_ROLES);

  if (rolesError) fail(`Could not read the roles: ${rolesError.message}`);

  const foundRoles = (roles ?? []).map((role) => role.name);
  const missing = ADMIN_ROLES.filter((name) => !foundRoles.includes(name));

  if (missing.length > 0) {
    console.warn(
      `[bootstrap] WARNING: these roles do not exist and were skipped: ${missing.join(", ")}`
    );
    console.warn(
      "[bootstrap] Apply migration 003 (seed data) to create the built-in roles."
    );
  }

  for (const role of roles ?? []) {
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role_id: role.id, created_at: new Date().toISOString() },
        { onConflict: "user_id,role_id" }
      );

    if (error) fail(`Could not assign the role "${role.name}": ${error.message}`);
    console.log(`[bootstrap] Assigned the role: ${role.name}`);
  }

  // 5. If the identity already existed, reset its password to the supplied
  //    temporary password so the administrator can sign in again.
  if (!createdAuthUser) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      fail(`Could not reset the password for the existing account: ${error.message}`);
    }
    console.log(
      "[bootstrap] Reset the temporary password on the existing authentication identity."
    );
  }

  console.log("\n[bootstrap] ------------------------------------------------------------");
  console.log("[bootstrap] The superadmin principal is ready.");
  console.log("[bootstrap]");
  console.log(`[bootstrap]   Email:    ${email}`);
  console.log("[bootstrap]   Password: the temporary password you supplied");
  console.log("[bootstrap]");
  console.log("[bootstrap] The administrator MUST change this password at first sign-in.");
  console.log("[bootstrap] Sign in at /login, then set a new password when prompted.");
  console.log("[bootstrap] ------------------------------------------------------------\n");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "An unexpected error occurred.");
});
