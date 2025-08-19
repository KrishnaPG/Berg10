import { SemanticRepo } from "../src/semantic-repo-manager";

const repo = new SemanticRepo("./my-repo");

await repo.createGroup("finance", { filter: {}, grouping: {}, lanes: [] });

await repo.writeManifestEntry({
	entity_id: "q4-p7",
	src_sha256: "abcd1234",
	blob_sha256: "def5678",
	lane_sha256: "lane123",
	embedder: "bert",
	model_cfg_digest: "sha256:xyz",
	git_commit: "a1b2c3",
	created_at: new Date().toISOString(),
	tags: ["finance", "pdf"],
});