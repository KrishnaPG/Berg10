/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
module.exports = {
	// whenever these are changed, also update the create methods in the db.js
	typedef: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schema: "json",
		private: { type: "boolean", index: true, default: false }		
	},
	users: {
		email: "email",
		memberOf: ["groups"]
	},
	groups: {
		name: { type: "string", unique: true, nullable: false, index: true, max: 128 },
		description: { type: "text", nullable: true }
	},
	acls: {
		resKey: { type: "string", nullable: false, index: true, max: 128 },
		resType: { type: "string", nullable: false, index: true, max: 32 },
		// list of actions and groups which have permissions for those actions
	}
};