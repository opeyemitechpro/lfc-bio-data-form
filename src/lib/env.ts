/**
 * Centralised environment access.
 *
 * Every secret is read on the server only. `NEXT_PUBLIC_*` values are the
 * only ones that may reach the browser bundle, and they are limited to
 * values the providers document as browser-safe.
 */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for the expected value.`
    );
  }
  return value.trim();
};

const optional = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const numeric = (name: string, fallback: number): number => {
  const raw = optional(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Public (browser-safe) configuration. */
export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  cloudinaryCloudName: () => required("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
  appUrl: () => optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
};

/** Server-only configuration. Never import this from a client component. */
export const serverEnv = {
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cloudinaryApiKey: () => required("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: () => required("CLOUDINARY_API_SECRET"),
  cloudinaryUploadFolder: () => optional("CLOUDINARY_UPLOAD_FOLDER") ?? "lfc-laderin/members",
  appUrl: () => optional("APP_URL") ?? optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  bootstrapAdminEmail: () => optional("BOOTSTRAP_ADMIN_EMAIL"),
  bootstrapAdminPassword: () => optional("BOOTSTRAP_ADMIN_PASSWORD"),
  bootstrapAdminName: () => optional("BOOTSTRAP_ADMIN_NAME") ?? "Superadmin",
  bootstrapAdminRoles: () =>
    (optional("BOOTSTRAP_ADMIN_ROLES") ?? "Resident Pastor")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  maxUploadBytes: () => numeric("MAX_UPLOAD_BYTES", 5 * 1024 * 1024),
  publicRateLimitPerHour: () => numeric("PUBLIC_RATE_LIMIT_PER_HOUR", 10),
  uploadRateLimitPerHour: () => numeric("UPLOAD_RATE_LIMIT_PER_HOUR", 20),
};

export const env = { public: publicEnv, server: serverEnv };
