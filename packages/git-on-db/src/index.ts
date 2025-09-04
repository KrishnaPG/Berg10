import { swagger } from "@elysiajs/swagger"; // Example plugin
import { Elysia } from "elysia";
import { CONFIG } from "./config";
import { initDB } from "./db";

const app = new Elysia();

initDB().then(()=>{
  return app.onError(({ code, error, set }) => {
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
  .get("/", ({ redirect }) => redirect("/graphql"))
  .get("/health", () => "{status: 'ok'}")
  .listen(CONFIG.PORT);
}).then(()=>{
  console.log(`🚀 Server on http://localhost:${CONFIG.PORT}`);
}).catch(ex => {
  console.error(ex.message);
});

export type App = typeof app;
