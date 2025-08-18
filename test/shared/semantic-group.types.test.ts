import { describe, expect, it } from "bun:test";
import type { ISemanticGroup } from "../../packages/shared/types/semantic-group.types";

describe("Semantic Group Type Definitions", () => {
	it("should allow creation of a valid ISemanticGroup object", () => {
		const group: ISemanticGroup = {
			name: "test-group",
			description: "A test group",
			filter: {
				operator: "AND",
				operands: [
					{
						field: "mime_type",
						op: "eq",
						value: "image/jpeg",
					},
				],
			},
			versionPolicy: {
				mode: "latestOnBranch",
				branch: "main",
			},
			grouping: {
				strategy: "composite",
				rules: [
					{
						match: { mime_type: "image/*" },
						strategy: "per_file",
						entityNameTemplate: "{{fileName}}",
					},
				],
			},
			lanes: [],
			metadata: {
				ownerTeam: "test-team",
				labels: {
					project: "berg10",
				},
			},
		};

		expect(group.name).toBe("test-group");
		expect(group.lanes.length).toBe(0);
	});
});
