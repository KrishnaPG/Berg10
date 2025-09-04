export const CONFIG = {
  PORT: Number(Bun.env.PORT ?? 3000),
  CACHE_MAX_ITEMS: Number(Bun.env.CACHE_MAX_ITEMS ?? 5000),
};