export default {
  // Format every staged file Prettier understands.
  '*.{ts,tsx,css,json,md,html}': 'prettier --write',
  // Type-check the whole project once (strict tsc catches unused vars, bad returns, etc.).
  // No filenames are appended so it runs project-wide rather than per-file.
  '*.{ts,tsx}': () => 'tsc -p tsconfig.app.json --noEmit',
}
