import { type Static, Type as T } from "@sinclair/typebox";
import type { TB58String, TSHA256B58 } from "./branded.types";

// Custom schemas
export const TB58Schema = T.Unsafe<TB58String>(
  T.String({
    pattern: "^[1-9A-HJ-NP-Za-km-z]+$", // Base58 character set
    description: "Base58 encoded string",
  }),
);

export const SHA256Schema = TB58Schema;