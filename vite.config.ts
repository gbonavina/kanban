import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) =>
  mode === "html"
    ? {
        // `npm run build:html`: everything (code, styles, fonts) inlined into one
        // HTML file that opens by double-click and keeps the board in the browser.
        plugins: [react(), tailwindcss(), viteSingleFile(), renameHtml("minha-rotina.html")],
        build: { outDir: "dist-html", emptyOutDir: true },
      }
    : {
        plugins: [react(), tailwindcss()],
        server: {
          proxy: { "/api": "http://localhost:4321" },
        },
      },
);

function renameHtml(fileName: string): Plugin {
  return {
    name: "rename-html",
    enforce: "post",
    generateBundle(_, bundle) {
      const page = bundle["index.html"];
      if (page) page.fileName = fileName;
    },
  };
}
