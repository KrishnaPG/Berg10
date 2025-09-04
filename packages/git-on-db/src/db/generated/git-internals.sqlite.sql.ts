/**
 * Generated from ../git-internals.schema.ts with \`drizzle-kit generate\` command
 */
export const sql = `
  CREATE TABLE IF NOT EXISTS\`gitCommit\` (
    \`commitId\` text(64) PRIMARY KEY NOT NULL,
    \`treeId\` text(64) NOT NULL,
    \`authorName\` text NOT NULL,
    \`authorEmail\` text NOT NULL,
    \`authorTime\` integer NOT NULL,
    \`committerName\` text NOT NULL,
    \`committerEmail\` text NOT NULL,
    \`commitTime\` integer NOT NULL,
    \`message\` text NOT NULL,
    FOREIGN KEY (\`commitId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`treeId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_commit_tree\` ON \`gitCommit\` (\`treeId\`);--> statement-breakpoint
  CREATE INDEX \`idx_commit_time\` ON \`gitCommit\` (\`commitTime\`);--> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitCommitParent\` (
    \`commitId\` text(64) NOT NULL,
    \`parentId\` text(64) NOT NULL,
    \`position\` integer NOT NULL,
    PRIMARY KEY(\`commitId\`, \`position\`),
    FOREIGN KEY (\`commitId\`) REFERENCES \`gitCommit\`(\`commitId\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`parentId\`) REFERENCES \`gitCommit\`(\`commitId\`) ON UPDATE no action ON DELETE cascade
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_commit_parent_parent\` ON \`gitCommitParent\` (\`parentId\`);--> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitConfig\` (
    \`section\` text NOT NULL,
    \`subsection\` text,
    \`key\` text NOT NULL,
    \`value\` text,
    PRIMARY KEY(\`section\`, \`subsection\`, \`key\`)
  );
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitIndexEntry\` (
    \`path\` text PRIMARY KEY NOT NULL,
    \`ctime\` integer NOT NULL,
    \`mtime\` integer NOT NULL,
    \`dev\` integer NOT NULL,
    \`ino\` integer NOT NULL,
    \`uid\` integer NOT NULL,
    \`gid\` integer NOT NULL,
    \`size\` integer NOT NULL,
    \`mode\` integer NOT NULL,
    \`blobId\` text(64) NOT NULL,
    \`flags\` integer DEFAULT 0 NOT NULL,
    \`stage\` integer DEFAULT 0 NOT NULL,
    FOREIGN KEY (\`blobId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_index_blob\` ON \`gitIndexEntry\` (\`blobId\`);--> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitObject\` (
    \`objectId\` text(64) PRIMARY KEY NOT NULL,
    \`type\` text NOT NULL,
    \`size\` integer NOT NULL,
    \`content\` blob NOT NULL
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_git_object_type\` ON \`gitObject\` (\`type\`);--> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitRef\` (
    \`name\` text PRIMARY KEY NOT NULL,
    \`value\` text(64),
    \`symbolic\` text
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_ref_value\` ON \`gitRef\` (\`value\`);--> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitRemote\` (
    \`name\` text PRIMARY KEY NOT NULL,
    \`url\` text NOT NULL,
    \`fetchSpec\` text NOT NULL
  );
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitShallow\` (
    \`commitId\` text(64) PRIMARY KEY NOT NULL
  );
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitTag\` (
    \`tagId\` text(64) PRIMARY KEY NOT NULL,
    \`objectId\` text(64) NOT NULL,
    \`type\` text NOT NULL,
    \`tagName\` text NOT NULL,
    \`taggerName\` text,
    \`taggerEmail\` text,
    \`tagTime\` integer,
    \`message\` text,
    FOREIGN KEY (\`tagId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`objectId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade
  );
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS\`gitTreeEntry\` (
    \`treeId\` text(64) NOT NULL,
    \`name\` text NOT NULL,
    \`mode\` integer NOT NULL,
    \`objectId\` text(64) NOT NULL,
    PRIMARY KEY(\`treeId\`, \`name\`),
    FOREIGN KEY (\`treeId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`objectId\`) REFERENCES \`gitObject\`(\`objectId\`) ON UPDATE no action ON DELETE cascade
  );
  --> statement-breakpoint
  CREATE INDEX \`idx_tree_entry_object\` ON \`gitTreeEntry\` (\`objectId\`);
`;