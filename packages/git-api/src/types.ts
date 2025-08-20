export interface Commit {
	sha: string;
	message: string;
	author: { name: string; email: string; date: string };
	committer: { name: string; email: string; date: string };
}

export interface FileEntry {
	path: string;
	mode: string;
	sha: string;
	size?: number;
}

export type BackendKind = "libgit2" | "shell";