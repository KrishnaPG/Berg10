import { describe, expect, it } from "bun:test";
import type { ISemanticEntity } from "../../packages/shared/types/semantic-entity.types";

describe("Semantic Entity Type Definitions", () => {
	it("should allow creation of a valid ISemanticEntity object", () => {
		const entity: ISemanticEntity = {
			id: "test-entity-123",
			sourceRefs: [
				{
					connectorType: "git",
					repository: "https://github.com/example/repo.git",
					ref: "main",
					path: "src/index.ts",
				},
			],
			metadata: {
				author: "test-user",
			},
		};

		expect(entity.id).toBe("test-entity-123");
		expect(entity.sourceRefs.length).toBe(1);
	});
});
