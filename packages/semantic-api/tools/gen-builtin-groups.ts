import type { TPath } from "../../git-api/src/services/types";
import { newLocalGroupID } from "../src/repo-paths";
import type { TGroups } from "../src/types";

export function generateBuiltInGroups(groups: TGroups): TGroups {
  const now = Date.now();
  const id1 = newLocalGroupID(1);
  groups[id1] = { n: "Images", d: "Built-in Group for Images", c: now, u: now };
  const id2 = newLocalGroupID(2);
  groups[id2] = { n: "Audio", d: "Built-in Group for Audio", c: now, u: now };
  const id3 = newLocalGroupID(3);
  groups[id3] = { n: "Video", d: "Built-in Group for Video", c: now, u: now };
  const id4 = newLocalGroupID(4);
  groups[id4] = { n: "PDF Documents", d: "Built-in Group for PDF Documents", c: now, u: now };
  return groups;
}
