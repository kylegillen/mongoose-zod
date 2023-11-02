import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  banner: {
    js: "'use client'",
  },
  ...options,
  splitting: true,
  clean: true, // clean up the dist folder
  dts: true, // generate dts files
  format: ['cjs', 'esm'], // generate cjs and esm files
  minify: true,
  bundle: true,
  skipNodeModulesBundle: true,
  entryPoints: ['src/index.ts'],
  watch: false,
  target: 'es2020',
  outDir: 'dist',
  entry: ['src/**/*.ts'], //include all files under src
}));
