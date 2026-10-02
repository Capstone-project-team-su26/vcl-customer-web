import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import chatHandler from "./api/chat.js";

const src = (segment = "") =>
  fileURLToPath(new URL(`./src/${segment}`, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: "local-api-chat-dev-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === "/api/chat" || req.url?.startsWith("/api/chat?")) {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  req.body = body ? JSON.parse(body) : {};
                } catch {
                  req.body = {};
                }

                res.status = (code) => {
                  res.statusCode = code;
                  return res;
                };
                res.json = (data) => {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                  return res;
                };

                await chatHandler(req, res);
              });
              return;
            }
            next();
          });
        },
      },
    ],

    resolve: {
      alias: {
        "@app": src("app"),
        "@shared": src("shared"),
        "@features": src("features"),
        "@layouts": src("layouts"),
        "@assets": src("assets"),
        "@": src(),
      },
    },
  };
});
