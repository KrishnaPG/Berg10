# berg10

Berg10 uses file system storage as the single source of truth for its operations, which means, there is a complex file-system hierarchy that is involved, as below:

- **fs**: the underlying source/input filesystem (`local`, `s3`, `git`, `lakefs`). This is third-party owned and we have only read-only access to it.
  
- **fsVCS**: version metadata folder created by us for version controlling the fs `local` and `s3` (the `.git` folder is stored here, separate from the user files fs); It is organized as below:
  -  `/<TFsVcsRootPath>`: The VCS Root folder
        -  |- `<SrcRepoId1>.git/`: contains HEAD, objects, refs etc.
        -  |- `<SrcRepoId1>.db/` : contains commits.parquet, refs.parquet etc.
        -  |- `<SrcRepoId2>.git/`
        -  |- `<SrcRepoId2>.db/`
        -  |- ...
        -  |- `<SrcRepoId3>.db/`
  -  for the `git` and `lakefs` type systems the `<SrcRepoId>.git/` may not exist (since those systems already maintain their own version metadata somewhere), or may usually be the same as fs.
  -  the `SrcRepoId` is usually the first commit id for external `.git` repos, else the workTree path hash;
  
-  **db**: LMDB root folder to hold the import sync status, checkpoints (and other ACID) relational data. Contains the `.lmdb` files for various tables. Any data/table that requires ACID transactions or CRUD will go into this.
  
- **fsDL**: the dataLake folder created and used by us to store the file system index generated from scanning/walking the fsVCS. Storing the file system paths and metadata in DL allows us to have SQL based file filtering possible (used in semantic group creation and entity mapping). In case of DuckDB Ducklake, this folder contains the metadata and the db parquet files. The parquet files should be directly mountable into any data-lake system (such as Dremio) to query the file system index tables. For enterprises, the DuckLake should work fine as centralized file system index, or can be replaced with any other enterprise-grade DBMS.
  
- **fsSem**: the semantic repo root that holds the semantic group definitions, entity mapping files, embedding vector index and blob files etc. The blobs folder is S3 mountable and the vector index is either VectorDB ingest-able or data lake mountable.

## DuckDB consumption
- DuckDB reads Parquet directly: 
  ```sql
  CREATE TABLE commits AS SELECT * FROM parquet_scan('s3://.../year=*/month=*/commits_*.parquet');
  ```
- For local files: `SELECT * FROM read_parquet('/path/to/*.parquet')`

- Keep parquet files immutable, DuckDB will happily query them.