/**
 * Test setup.
 *
 * The unit tests exercise pure logic (validation, normalisation, RBAC
 * decisions, export sanitisation) that does not require a live database.
 */
import { vi } from "vitest";

// The `server-only` package throws when it is imported from a client
// bundle. The unit tests import server modules directly, so the guard is
// replaced with a no-op.
vi.mock("server-only", () => ({}));

// Provide placeholder environment values so that modules that read the
// environment at import time do not throw.
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key";
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "test-cloud";
process.env.CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY ?? "test-api-key";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET ?? "test-api-secret";
