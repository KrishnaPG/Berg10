import { Elysia, t } from "elysia";
import { backend } from "../services/drivers";

export const fileRoutes = new Elysia({ prefix: "/v1" })
	.get("/repos/:repo/files", async ({ params: { repo }, query }) => {
		const { rev = "HEAD", path, recursive } = query;
		const files = await backend
			.current()
			.listFiles(repo, rev, path, recursive === "true");
		return files;
	})
	.put(
		"/repos/:repo/file/*",
		async ({ params, body }) => {
			const { repo } = params;
			const path = params["*"];
			await backend.current().stageFile(repo, path, body as string);
			return { status: "staged", path };
		},
	);