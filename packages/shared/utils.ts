import { sha256 } from "@fict/crypto";
import type { TSHA256B58 } from "./types";

/**
 * Generates a SHA256 and Encodes it as Base58
 * @param str Stingified payload to be hashed
 * @returns Base58 encoded string
 */
export function hashNEncode(str: string): TSHA256B58 {
	return sha256(str).toBase58() as TSHA256B58;
}

export function maybeGitRepoRootPath(path: string): path is TGitRepoRootPath {
  // Add actual validation logic here
  return path.endsWith(".git") || fs.existsSync(path + "/.git");
}