import { ensureTables } from "@shared/ducklake/";
import type { TDuckLakeDBName, TDuckLakeRootPath, TSQLString } from "@shared/types";
import { sql } from "./schemas/git-internals.duckdb.sql";

export function initDB(lakeRootPath: TDuckLakeRootPath) {
  return ensureTables(lakeRootPath, "gitLake" as TDuckLakeDBName, sql as TSQLString).then(({ db }) => db);
}
