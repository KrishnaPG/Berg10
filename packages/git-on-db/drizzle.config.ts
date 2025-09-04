// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './migrations',
  schema: './src/db/schemas/*.schema.ts',
  dialect: 'sqlite',
  verbose: true
});
