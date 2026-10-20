import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createBrowserClient,
  createServerClient,
} from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { env } from "@/lib/env";

/**
 * Browser-side Supabase client (anon key only).
 * Used only for Auth operations that are safe to run from the browser.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient(
    env.public.supabaseUrl(),
    env.public.supabaseAnonKey()
  );
}

/**
 * Request-scoped Supabase client bound to the current user's cookies.
 * RLS applies, so it is only used for identity/session lookups.
 */
export const createServerSupabaseClient = cache(async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();

  return createServerClient(env.public.supabaseUrl(), env.public.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: Record<string, unknown>;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          );
        } catch {
          // Called from a Server Component: middleware refreshes sessions instead.
        }
      },
    },
  });
});

/**
 * Privileged service-role client.
 *
 * Bypasses RLS. Every call site MUST perform server-side authorization
 * first. Only import this from server-side modules.
 */
export const createAdminSupabaseClient = cache(async (): Promise<SupabaseClient> => {
  return createClient(env.public.supabaseUrl(), env.server.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});
