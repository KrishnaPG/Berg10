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
		belongsTo: ["resourceGroups"],
		ownerUG: "userGroups"
	},
	users: {
		email: "email",
		memberOf: ["userGroups"],
		createdUG: ["userGroups"],
		createdRG: ["resourceGroups"]
	},
	userGroups: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		description: { type: "text", nullable: true },
		permission: ["resGroupMethods"],
		//createdBy: "users",
		//appCtx: { type: "string", nullable: true, index: true, max: 32 },
	},
	resourceGroups: {
		name: { type: "string", nullable: false, index: true, max: 32 },
		description: { type: "text", nullable: true },
		//createdBy: "users",
		//appCtx: { type: "string", nullable: true, index: true, max: 32 },
	},
	resGroupMethods: {
		rg: "resourceGroups",
		type: "typeDefs",
		method: "typeMethods",
		permit: ["allow", "deny"]
	},
	acls: {
		resKey: { type: "string", nullable: false, index: true, max: 128 },
		resType: { type: "string", nullable: false, index: true, max: 32 },
		// list of actions and groups which have permissions for those actions
	}
	// whenever these are changed, also update the create methods in the db.js
};