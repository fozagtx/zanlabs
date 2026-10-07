import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and must load from node_modules at runtime, not from the bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  // Ship SQL migrations with every server function so first access can migrate.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*", "./assets/fonts/**/*"] },
  async rewrites() {
    // Creator storefronts live at /@handle (the link creators put in every bio).
    return [{ source: "/@:handle", destination: "/c/:handle" }];
  },
};

export default nextConfig;
