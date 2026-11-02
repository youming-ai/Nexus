module.exports = {
  "**/*.{ts,tsx,js,jsx,json}": (filenames) =>
    filenames.map((file) => `biome check --write '${file}'`),
}
