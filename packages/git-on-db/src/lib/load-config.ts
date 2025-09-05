import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { type Config, TConfig } from "./types";

const C = TypeCompiler.Compile(TConfig);
let _cfg: Config | null = null;

export function loadConfig(repo: string, override?: string): Config {
  if (_cfg) return _cfg;
  const path = override || join(repo, ".git_duck_sync/config.json");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!C.Check(raw)) throw new Error("Invalid config: " + C.Errors(raw));
  _cfg = raw;
  return _cfg;
}
