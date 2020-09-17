/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
module.exports = {
	// whenever these are changed, also update the create methods in the db.js
	interfaces: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 64 },
		description: { type: "text", nullable: true }
	},
	interfaceMethods: {
		interface: "interfaces",
		name: { type: "string", unique: false, nullable: false, index: true, max: 32 },
		inputSchema: "json",
		outputSchema: "json",
		description: { type: "text", nullable: true }
	},
	typeDefs: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 64 },
		schema: "json",
		supportedInterfaces: ["interfaces"]
	},
	resources: {
		type: "typeDefs",
		belongsTo: ["resourceGroups"],// different RG for different rgCtx ()
		ownerUG: {	// the owner-group for the resource, created by the system
			type: "fk", foreignKey: "userGroups", unique: true
		}
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
		permissions: ["resGroupMethods"],
		profileExt: "typeDefs"
	},
	resourceGroups: {
		name: { type: "string", nullable: false, index: true, max: 32 },
		description: { type: "text", nullable: true },
	},
	resGroupMethods: {
		rg: "resourceGroups",
		interface: "interfaces",
		method:"regex",
		permit: ["allow", "deny"]
	},
	appCtx: {
		name: "string",	// any details such as the website, appName etc.
		description: "string",
		adminUG: { type: "fk", foreignKey: "userGroups", unique: true },	// the admin userGroup for this appCtx
		loginUG: { type: "fk", foreignKey: "userGroups", unique: true },	// subset of Everyone group, accepted to be part of this appCtx
		inactiveUG: { type: "fk", foreignKey: "userGroups", unique: true },// group for users that are marked as inactive in this appCtx
		publicKey: "string",	// only the owner/creator of this appCtx will hold the privateKey for this
	}
	// whenever these are changed, also update the create methods in the db.js
};