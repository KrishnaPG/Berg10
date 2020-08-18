/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
module.exports = {
	// whenever these are changed, also update the create methods in the db.js
	typeDefs: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schema: "json",
		private: { type: "boolean", index: true, default: false }
	},
	typeMethods: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 64 },
		inputs: "json",
		outputs: "json",
		typedef: "typeDefs"
	},
	resources: {
		type: "typeDefs",
		belongsTo: ["resourceGroups"],// different RG for different rgCtx ()
		ownerUG: "userGroups"					// the owner-group for the resource, created by the system
	},
	users: {
		email: "email",
		memberOf: ["userGroups"],			// belongs to different UGs based on ugCtx
		createdUG: ["userGroups"],		// different UGs created under different appCtx
		createdRG: ["resourceGroups"],// different RGs created under different appCtx
		defaultRG: ["resourceGroups"],// one default RG for each appCtx, assigned by the system
	},
	userGroups: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		description: { type: "text", nullable: true },
		permission: ["resGroupMethods"],
	},
	resourceGroups: {
		name: { type: "string", nullable: false, index: true, max: 32 },
		description: { type: "text", nullable: true },
	},
	resGroupMethods: {
		rg: "resourceGroups",
		type: "typeDefs",
		method: "typeMethods",
		permit: ["allow", "deny"]
	},
	// secCtx: {
	// 	appCtx: { type: "string", nullable: false, index: true, max: 32 },
	// },
	acls: {
		resKey: { type: "string", nullable: false, index: true, max: 128 },
		resType: { type: "string", nullable: false, index: true, max: 32 },
		// list of actions and groups which have permissions for those actions
	}
	// whenever these are changed, also update the create methods in the db.js
};