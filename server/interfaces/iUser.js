/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');

function getFullDetails(db, { userId }, acl) {
	return { name: "getFullDetails" };
}

module.exports = {
	name: "iUser",
	methods: {
		"getFullDetails": {
			description: "Resolves all references and returns the complete user-record",
			inputSchema: JOI.object({
				userId: Validators.id
			}),
			outputSchema: {},
			fn: getFullDetails
		},
	}
}