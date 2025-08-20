import { Elysia } from "elysia";
import { CONFIG } from "./config";
import { gQLPlugin } from "./graphql/schema";
import { commitRoutes } from "./routes/commit";
import { fileRoutes } from "./routes/file";
import { repoRoutes } from "./routes/repo";

const app = new Elysia()
	.use(gQLPlugin as any)
	.use(repoRoutes as any)
	.use(fileRoutes as any)
	.use(commitRoutes as any)
	.get("/", ({ set }) => {
		set.redirect = "/graphql";
		return "Redirecting to GraphQL";
	})
	.get("/health", () => "ok")
	.listen(CONFIG.PORT);

console.log(`🚀 Server on http://localhost:${CONFIG.PORT}`);
export type App = typeof app;
