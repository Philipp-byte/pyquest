import { defineConfig } from "vite";

// base: passt zum GitHub-Pages-Unterpfad (https://philipp-byte.github.io/pyquest/).
// Im Schulmodus (eigener Server auf "/") kann base per ENV auf "/" gesetzt werden.
export default defineConfig({
  base: process.env.PYQUEST_BASE ?? "/pyquest/",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});
