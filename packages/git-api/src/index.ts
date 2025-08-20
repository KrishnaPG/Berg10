import { Elysia } from "elysia";
import { CONFIG } from "./config";
import { gQLPlugin } from "./graphql/schema";
import { commitRoutes } from "./routes/commit";
import { fileRoutes } from "./routes/file";
import { repoRoutes } from "./routes/repo";

const app = new Elysia()
	.use(gQLPlugin)
	.use(repoRoutes)
	.use(fileRoutes)
	.use(commitRoutes)
	.get("/", ({ redirect }) => redirect("/graphql"))
	.get("/health", () => "ok")
	.listen(CONFIG.PORT);

console.log(`🚀 Server on http://localhost:${CONFIG.PORT}`);
export type App = typeof app;
