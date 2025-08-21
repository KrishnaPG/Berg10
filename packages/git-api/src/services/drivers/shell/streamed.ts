import { Readable } from "node:stream";
import type { IListCommitsOptions, TCommitMessage, TSha } from "../../types";
import { gitStream } from "./helpers";

// ---------- streaming with cursor ----------
export interface IListCommitsStreamOptions extends IListCommitsOptions {
  after?: TSha; // cursor
  first?: number; // max items
}

/**
 * Async generator that never buffers the whole list.
 * `after` is interpreted as “commits *older* than this SHA”.
 */
export async function* listCommitsStream(opts: IListCommitsStreamOptions = {}) {
  const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd|%P|%T", "--date=iso"];

  if (opts.after) args.push(`${opts.after}..HEAD`);
  if (opts.path) args.push("--", opts.path);
  if (opts.author) args.push("--author", opts.author);
  if (opts.since) args.push("--since", opts.since);
  if (opts.until) args.push("--until", opts.until);

  // default page size
  const limit = opts.first ?? 100;
  args.push(`-n${limit + 1}`); // +1 lets us know if there is a next page

  let lineBuf = "";
  let yielded = 0;

  for await (const chunk of gitStream(".", args)) {
    lineBuf += chunk;
    let nl: number;
    while ((nl = lineBuf.indexOf("\n")) !== -1) {
      const line = lineBuf.slice(0, nl);
      lineBuf = lineBuf.slice(nl + 1);

      const [sha, msg, an, ae, ad, cn, ce, cd, parents, tree] = line.split("|");
      if (++yielded > limit) {
        // reached +1 record → emit cursor only
        yield { _cursor: sha as TSha }; // sentinel object
        return;
      }

      yield {
        sha: sha as TSha,
        message: msg as TCommitMessage,
        author: { name: an, email: ae, date: ad },
        committer: { name: cn, email: ce, date: cd },
        tree: { sha: tree as TSha, url: "" },
        parents: parents
          .split(" ")
          .filter(Boolean)
          .map((p) => ({ sha: p as TSha, url: "" })),
        url: "",
        html_url: "",
        comments_url: "",
      };
    }
  }
}

/** Node-style Readable wrapper for legacy servers */
export function listCommitsReadable(opts?: IListCommitsStreamOptions): Readable {
  return Readable.from(listCommitsStream(opts), { objectMode: true });
}
