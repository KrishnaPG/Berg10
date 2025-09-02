# berg10

Berg10 uses file system storage as the single source of truth for its operations, which means, there is a complex file-system hierarchy that is invovled, as below:

- **fs**: the underlying source/input filesystem (`local`, `s3`, `git`, `lakefs`). This is third-party owned and we have only read-only access to it.
  
- **fsVCS**: version metadata folder created by us for version controlling the fs `local` and `s3` (the `.git` folder is stored here, separate from the user files fs); for the `git` and `lakefs` type systems this may not exist (since those systems already maintain their own version metadata somewhere), or may usually be the same as fs.
  
- **fsDB**: the database folder created and used by us to store the file system index generated from scanning/walking the fsVCS. Storing the file system paths and metadata in DB allows us to have SQL based file filtering possible (used in semantic group creation and entity mapping). In case of DuckDB Ducklake, this folder contains the metadata and the db parquet files. The parquet files should be directly mountable into any data-lake system (such as Dremio) to query the file system index tables. For enterprises, the DuckLake should work fine as centralized file system index, or can be replaced with any other enterprise-grade DBMS.
  
- **fsSem**: the semantic repo root that holds the semantic group definitions, entity mapping files, embedding vector index and blob files etc. The blobs folder is S3 mountable and the vector index is either VectorDB injestable or data lake mountable.

## Development
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
