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
		email: "email"
	}
};