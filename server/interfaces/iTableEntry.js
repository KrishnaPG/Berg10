/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');

module.exports = {
	name: "iTableEntry",
	methods: {
		"listing": {
			description: "Allows listing this database record as part of the bulk query",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => { throw new Error(`iTableEntry.listing not implemented`) }
		},
		"read": {
			description: "Allows reading the content of this database record",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => { throw new Error(`iTableEntry.read not implemented`) }
		},
		"update": {
			description: "Allows modifying the content of this database record",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => { throw new Error(`iTableEntry.update not implemented`) }
		},
		"delete": {
			description: "Allows deleting this database record",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => { throw new Error(`iTableEntry.delete not implemented`) }
		}		
	},
	description: "The built-in tableEntry interface"
};