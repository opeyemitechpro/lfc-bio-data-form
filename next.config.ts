import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `cacheComponents` (Next.js 16) enables partial prerendering, which
   * requires every dynamic data access to sit inside a `<Suspense>`
   * boundary. This application is almost entirely dynamic and
   * authentication-gated — the dashboard, the member directory and the
   * public form all read the request session and the database on every
   * request — so the standard dynamic rendering model is used instead.
   */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
