export const CONFIG = {
  GIT_BACKEND: (Bun.env.GIT_BACKEND as "libgit2" | "shell" | "isogit") ?? "isogit",
  REPO_BASE: Bun.env.REPO_BASE ?? "/repos",
  PORT: Number(Bun.env.PORT ?? 3000),
  CACHE_MAX_ITEMS: Number(Bun.env.CACHE_MAX_ITEMS ?? 5000),
};