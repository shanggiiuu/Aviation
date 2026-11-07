import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/migrate.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  // The shared package is TypeScript source, so bundle it into the server output.
  noExternal: ["@aerolearn/shared"],
});
