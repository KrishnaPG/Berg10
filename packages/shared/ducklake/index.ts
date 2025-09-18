import type { TDuckLakeDBName, TDuckLakeRootPath, TSQLString } from "@types";
import { setupLake } from "./driver";

export function ensureTables(lakeRootPath: TDuckLakeRootPath, lakeDBName: TDuckLakeDBName, sql: TSQLString) {
  return setupLake(lakeRootPath, lakeDBName).then((lakeDBInfo) => {
    return lakeDBInfo.db.exec(sql).then(() => lakeDBInfo);
  });
}

export * from "./driver";
export * from "./helpers";
