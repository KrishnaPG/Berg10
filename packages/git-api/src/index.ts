import { swagger } from "@elysiajs/swagger"; // Example plugin
import { Elysia } from "elysia";
import { CONFIG } from "./config";
import { gQLPlugin } from "./graphql/schema";
import { commitRoutes } from "./routes/commit";
import { fileRoutes } from "./routes/file";
import { repoRoutes } from "./routes/repo";

const app = new Elysia()
  .onError(({ code, error, set }) => {
    switch (code) {
      case "NOT_FOUND":
        set.status = 404;
        return { error: "Not Found" };
      case "INTERNAL_SERVER_ERROR":
        set.status = 500;
        return { error: "Internal Server Error" };
      default:
        set.status = 500;
        console.error(error);
        return { error: "An unexpected error occurred" };
    }
  })
  .use(swagger()) // Chains the Swagger plugin
  .use(gQLPlugin)
  .use(repoRoutes)
  .use(fileRoutes)
  .use(commitRoutes)
  .get("/", ({ redirect }) => redirect("/graphql"))
  .get("/health", () => "{status: 'ok'}")
  .listen(CONFIG.PORT);

console.log(`🚀 Server on http://localhost:${CONFIG.PORT}`);
export type App = typeof app;
