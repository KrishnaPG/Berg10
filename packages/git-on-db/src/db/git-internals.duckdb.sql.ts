/**
 * This is DuckLake DuckDB Sql. DuckLake does not yet support:
 *  - primary/foreign keys
 *  - constraint checks
 *  - default values
 * Those have to be managed in the code.
 */
export const sql = `
-- 6.1  Core objects
CREATE TABLE IF NOT EXISTS git_object (
    object_id  CHAR(64) PRIMARY KEY,
    type       VARCHAR(6) CHECK (type IN ('blob','tree','commit','tag')),
    size       BIGINT,
    content    BLOB                    -- uncompressed bytes
) WITH (
  format = 'parquet'
);

-- 6.2  Trees and tree entries
CREATE TABLE IF NOT EXISTS tree_entry (
    tree_id    CHAR(64) REFERENCES git_object(object_id) ON DELETE CASCADE,
    name       VARCHAR NOT NULL,       -- file or dir name
    mode       INTEGER,                -- e.g. 0100644
    object_id  CHAR(64) REFERENCES git_object(object_id) ON DELETE CASCADE,
    PRIMARY KEY (tree_id, name)
) WITH (
  format = 'parquet'
);

-- 6.3  Commits
CREATE TABLE IF NOT EXISTS commit (
    commit_id  CHAR(64) PRIMARY KEY REFERENCES git_object(object_id) ON DELETE CASCADE,
    tree_id    CHAR(64) NOT NULL REFERENCES git_object(object_id),
    author_name     VARCHAR,
    author_email    VARCHAR,
    author_time     TIMESTAMP WITH TIME ZONE,
    committer_name  VARCHAR,
    committer_email VARCHAR,
    commit_time     TIMESTAMP WITH TIME ZONE,
    message         VARCHAR
) WITH (
  format = 'parquet'
);

CREATE TABLE IF NOT EXISTS commit_parent (
    commit_id  CHAR(64) REFERENCES commit(commit_id) ON DELETE CASCADE,
    parent_id  CHAR(64) REFERENCES commit(commit_id),
    position   SMALLINT,               -- 0..n for ordered parents
    PRIMARY KEY (commit_id, position)
) WITH (
  format = 'parquet'
);

-- 6.4  Annotated tags
CREATE TABLE IF NOT EXISTS tag (
    tag_id     CHAR(64) PRIMARY KEY REFERENCES git_object(object_id) ON DELETE CASCADE,
    object_id  CHAR(64) NOT NULL REFERENCES git_object(object_id),
    type       VARCHAR(6) CHECK (type IN ('blob','tree','commit','tag')),
    tag_name   VARCHAR NOT NULL,
    tagger_name  VARCHAR,
    tagger_email VARCHAR,
    tag_time     TIMESTAMP WITH TIME ZONE,
    message      VARCHAR
) WITH (
  format = 'parquet'
);

-- 6.5  Refs
CREATE TABLE IF NOT EXISTS ref (
    name       VARCHAR PRIMARY KEY,     -- e.g. refs/heads/main
    value      CHAR(64),               -- commit id, tag id, etc.
    symbolic   VARCHAR,                -- if it is a symbolic ref, store target name
    CHECK ((value IS NULL) <> (symbolic IS NULL))
) WITH (
  format = 'parquet'
);

-- 6.6  Index (staging area)
CREATE TABLE IF NOT EXISTS index_entry (
    path       VARCHAR PRIMARY KEY,
    ctime      BIGINT,
    mtime      BIGINT,
    dev        INTEGER,
    ino        BIGINT,
    uid        INTEGER,
    gid        INTEGER,
    size       BIGINT,
    mode       INTEGER,
    blob_id    CHAR(64) REFERENCES git_object(object_id) ON DELETE CASCADE,
    flags      SMALLINT,
    stage      SMALLINT
) WITH (
  format = 'parquet'
);

-- 6.7  Configuration
CREATE TABLE IF NOT EXISTS config (
    section    VARCHAR,                -- e.g. 'core'
    subsection VARCHAR,                -- e.g. 'remote "origin"'
    key        VARCHAR,                -- e.g. 'url'
    value      VARCHAR,
    PRIMARY KEY (section, subsection, key)
) WITH (
  format = 'parquet'
);

-- 6.8  Remotes
CREATE TABLE IF NOT EXISTS remote (
    name      VARCHAR PRIMARY KEY,
    url       VARCHAR NOT NULL,
    fetchspec VARCHAR NOT NULL
) WITH (
  format = 'parquet'
);

-- 6.9  Shallow commits (for shallow clones)
CREATE TABLE IF NOT EXISTS shallow (
    commit_id CHAR(64) PRIMARY KEY
) WITH (
  format = 'parquet'
);

CREATE INDEX idx_object_type        ON git_object(type);
CREATE INDEX idx_tree_entry_object  ON tree_entry(object_id);
CREATE INDEX idx_commit_tree        ON commit(tree_id);
CREATE INDEX idx_commit_time        ON commit(commit_time);
CREATE INDEX idx_commit_parent_parent ON commit_parent(parent_id);
CREATE INDEX idx_ref_value          ON ref(value);
`;