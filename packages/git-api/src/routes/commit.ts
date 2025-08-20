import { Elysia } from "elysia";
import { backend } from "../git/backend";

export const commitRoutes = new Elysia({ prefix: "/v1" }).patch(
	"/repos/:repo/commits/:sha/revert",
	async ({ params: { repo, sha } }) => {
		const newSha = await backend.current().revertCommit(repo, sha);
		return { reverted: sha, newSha };
	},
);