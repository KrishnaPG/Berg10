// Drizzle ORM schema (SQLite dialect) matching the SQLite DDL exactly
// Run `drizzle-kit generate:sqlite` to create migrations.

import { blob, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const sha256StrLen = 64;

/* ------------------------------------------------------------------ */
/* 1. Core objects (blob, tree, commit, tag)                          */
/* ------------------------------------------------------------------ */
export const gitObject = sqliteTable(
  "gitObject",
  {
    objectId: text({ length: sha256StrLen }).primaryKey(),
    type: text({ enum: ["blob", "tree", "commit", "tag"] }).notNull(),
    size: integer().notNull(),
    content: blob().notNull(),
  },
  (t) => [index("idx_git_object_type").on(t.type)],
);

/* ------------------------------------------------------------------ */
/* 2. Tree entries                                                    */
/* ------------------------------------------------------------------ */
export const gitTreeEntry = sqliteTable(
  "gitTreeEntry",
  {
    treeId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitObject.objectId, { onDelete: "cascade" }),
    name: text().notNull(),
    mode: integer().notNull(),
    objectId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitObject.objectId, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.treeId, t.name] }), index("idx_tree_entry_object").on(t.objectId)],
);

/* ------------------------------------------------------------------ */
/* 3. Commits                                                         */
/* ------------------------------------------------------------------ */
export const gitCommit = sqliteTable(
  "gitCommit",
  {
    commitId: text({ length: sha256StrLen })
      .primaryKey()
      .references(() => gitObject.objectId, { onDelete: "cascade" }),
    treeId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitObject.objectId, { onDelete: "cascade" }),
    authorName: text().notNull(),
    authorEmail: text().notNull(),
    authorTime: integer({ mode: "timestamp" }).notNull(),
    committerName: text().notNull(),
    committerEmail: text().notNull(),
    commitTime: integer({ mode: "timestamp" }).notNull(),
    message: text().notNull(),
  },
  (t) => [index("idx_commit_tree").on(t.treeId), index("idx_commit_time").on(t.commitTime)],
);

/* commit → parent edges */
export const gitCommitParent = sqliteTable(
  "gitCommitParent",
  {
    commitId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitCommit.commitId, { onDelete: "cascade" }),
    parentId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitCommit.commitId, { onDelete: "cascade" }),
    position: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.commitId, t.position] }), index("idx_commit_parent_parent").on(t.parentId)],
);

/* ------------------------------------------------------------------ */
/* 4. Annotated tags                                                  */
/* ------------------------------------------------------------------ */
export const gitTag = sqliteTable("gitTag", {
  tagId: text({ length: sha256StrLen })
    .primaryKey()
    .references(() => gitObject.objectId, { onDelete: "cascade" }),
  objectId: text({ length: sha256StrLen })
    .notNull()
    .references(() => gitObject.objectId, { onDelete: "cascade" }),
  type: text({ enum: ["blob", "tree", "commit", "tag"] }).notNull(),
  tagName: text().notNull(),
  taggerName: text(),
  taggerEmail: text(),
  tagTime: integer({ mode: "timestamp" }),
  message: text(),
});

/* ------------------------------------------------------------------ */
/* 5. References (branches, tags, HEAD, remotes, …)                   */
/* ------------------------------------------------------------------ */
export const gitRef = sqliteTable(
  "gitRef",
  {
    name: text().primaryKey(),
    value: text({ length: sha256StrLen }),
    symbolic: text(),
  },
  (t) => [index("idx_ref_value").on(t.value)],
);

/* ------------------------------------------------------------------ */
/* 6. Index (staging area)                                            */
/* ------------------------------------------------------------------ */
export const gitIndexEntry = sqliteTable(
  "gitIndexEntry",
  {
    path: text().primaryKey(),
    ctime: integer().notNull(),
    mtime: integer().notNull(),
    dev: integer().notNull(),
    ino: integer().notNull(),
    uid: integer().notNull(),
    gid: integer().notNull(),
    size: integer().notNull(),
    mode: integer().notNull(),
    blobId: text({ length: sha256StrLen })
      .notNull()
      .references(() => gitObject.objectId, { onDelete: "cascade" }),
    flags: integer().default(0).notNull(),
    stage: integer().default(0).notNull(),
  },
  (t) => [index("idx_index_blob").on(t.blobId)],
);

/* ------------------------------------------------------------------ */
/* 7. Configuration                                                   */
/* ------------------------------------------------------------------ */
export const gitConfig = sqliteTable(
  "gitConfig",
  {
    section: text().notNull(),
    subsection: text(),
    key: text().notNull(),
    value: text(),
  },
  (t) => [primaryKey({ columns: [t.section, t.subsection, t.key] })],
);

/* ------------------------------------------------------------------ */
/* 8. Remotes                                                         */
/* ------------------------------------------------------------------ */
export const gitRemote = sqliteTable("gitRemote", {
  name: text().primaryKey(),
  url: text().notNull(),
  fetchSpec: text().notNull(),
});

/* ------------------------------------------------------------------ */
/* 9. Shallow commits                                                 */
/* ------------------------------------------------------------------ */
export const gitShallow = sqliteTable("gitShallow", {
  commitId: text({ length: sha256StrLen }).primaryKey(),
});
