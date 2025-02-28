import { defineConfig } from 'rolldown'
import replaceImports from "rollup-plugin-replace-imports-with-vars";

export default defineConfig({
  input: 'src/main.ts',
 output: [
    { file: "dist/es/replicad-threads.js", format: "es" },
    {
      file: "dist/studio/replicad-threads.js",
      format: "es",
      plugins: [
        replaceImports({
          varType: "const",
          replacementLookup: { replicad: "replicad" },
        }),
      ],
    },
  ],
  external: ["replicad"],
})
