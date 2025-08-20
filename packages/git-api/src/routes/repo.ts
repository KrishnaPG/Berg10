import { Elysia, t } from "elysia";
import { backend } from "../git/backend";

export const repoRoutes = new Elysia({ prefix: "/v1" })
	.post("/repos/:repo", async ({ params: { repo } }) => {
		await backend.current().init(repo);
		return { status: "created", repo };
	})
	.delete("/repos/:repo", ({ params: { repo } }) => {
		// (placeholder) delete repo
		return { status: "deleted", repo };
	});