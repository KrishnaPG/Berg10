import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("sql_playground", {
  migrations: "./migrations",
});
