export const CONFIG = {
	GIT_BACKEND: (Bun.env.GIT_BACKEND as "libgit2" | "shell") ?? "libgit2",
	REPO_BASE: Bun.env.REPO_BASE ?? "/repos",
	PORT: Number(Bun.env.PORT ?? 3000),
};