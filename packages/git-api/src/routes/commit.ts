import { Elysia } from "elysia";
import { backend } from "../services/drivers";

export const commitRoutes = new Elysia({ prefix: "/v1" }).patch(
	"/repos/:repo/commits/:sha/revert",
	async ({ params: { repo, sha } }) => {
		const newSha = await backend.current().revertCommit(repo, sha);
		return { reverted: sha, newSha };
	},
);