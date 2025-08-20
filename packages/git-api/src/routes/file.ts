import { Elysia, t } from "elysia";
import { backend } from "../git/backend";

export const fileRoutes = new Elysia({ prefix: "/v1" })
	.get("/repos/:repo/files", async ({ params: { repo }, query }) => {
		const { rev = "HEAD", path, recursive } = query;
		const files = await backend
			.current()
			.listFiles(repo, rev, path, recursive === "true");
		return files;
	})
	.put(
		"/repos/:repo/files/:path{.+}",
		async ({ params: { repo, path }, body }) => {
			await backend.current().stageFile(repo, path, body as string);
			return { status: "staged", path };
		},
	);