import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { voidPlugin } from "void"

export default defineConfig({
  server: { port: 3000, strictPort: true },
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [voidPlugin(), tanstackStart(), react(), tailwindcss()],
})
