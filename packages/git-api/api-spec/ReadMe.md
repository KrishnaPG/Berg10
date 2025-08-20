# Ultra-High-Performance Git-Repo Management API

1. Repository
```
POST   /v1/repos                    # Create repository
GET    /v1/repos                    # List repositories
GET    /v1/repos/:repo              # Get repository info
PUT    /v1/repos/:repo              # Update repository
DELETE /v1/repos/:repo              # Delete repository
POST   /v1/repos/:repo/clone        # Clone repository
POST   /v1/repos/:repo/mirror       # Mirror repository
POST   /v1/repos/:repo/gc           # Garbage collection
GET    /v1/repos/:repo/config       # Get repository config
PUT    /v1/repos/:repo/config       # Set repository config
```


2. Refs (Branches/Tags)
```
GET    /v1/repos/:repo/refs          # List all refs
GET    /v1/repos/:repo/branches     # List branches
GET    /v1/repos/:repo/tags         # List tags
GET    /v1/repos/:repo/refs/:ref    # Get specific ref
POST   /v1/repos/:repo/branches     # Create branch
POST   /v1/repos/:repo/tags         # Create tag
DELETE /v1/repos/:repo/refs/:ref    # Delete ref
PUT    /v1/repos/:repo/branches/:branch # Rename branch
POST   /v1/repos/:repo/branches/:branch/protect # Protect branch
DELETE /v1/repos/:repo/branches/:branch/protect # Unprotect branch
```


3. Commit
```
GET    /v1/repos/:repo/commits      # List commits
GET    /v1/repos/:repo/commits/:sha # Get specific commit
POST   /v1/repos/:repo/commits      # Create commit
POST   /v1/repos/:repo/commits/:sha/cherry-pick # Cherry-pick commit
POST   /v1/repos/:repo/commits/:sha/revert # Revert commit
PATCH  /v1/repos/:repo/commits/:sha # Amend commit
POST   /v1/repos/:repo/commits/:sha/reset # Reset to commit
```


4. Tree/File
```
GET    /v1/repos/:repo/files        # List files
GET    /v1/repos/:repo/files/:path  # Get file content
PUT    /v1/repos/:repo/files/:path  # Create/update file
DELETE /v1/repos/:repo/files/:path  # Delete file
PUT    /v1/repos/:repo/files/:path/move # Move/rename file
```


5. Index (Staging)
```
GET    /v1/repos/:repo/index         # List staged changes
POST   /v1/repos/:repo/index/:path  # Stage file
DELETE /v1/repos/:repo/index/:path  # Unstage file
POST   /v1/repos/:repo/index/:path/patch # Stage patch
POST   /v1/repos/:repo/index/:path/discard # Discard worktree changes
```


6. Stash
```
GET    /v1/repos/:repo/stashes       # List stashes
POST   /v1/repos/:repo/stashes      # Save stash
POST   /v1/repos/:repo/stashes/:index/apply # Apply stash
DELETE /v1/repos/:repo/stashes/:index # Drop stash
```


7. Diff
```
GET    /v1/repos/:repo/diff          # Compare commits
GET    /v1/repos/:repo/diff/index    # Compare index with working tree
GET    /v1/repos/:repo/diff/worktree # Show working tree changes
GET    /v1/repos/:repo/diff/:id      # Format diff output
```


8. Log/Blame
```
GET    /v1/repos/:repo/log           # Get commit history
GET    /v1/repos/:repo/blame/:path   # Annotate file with commit info
```


9. Merge/Rebase
```
POST   /v1/repos/:repo/merge         # Merge branch
POST   /v1/repos/:repo/rebase        # Rebase branch