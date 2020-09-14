/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');

function isAdmin(db, acl) {
	
}

function getFullDetails(db, { userId }, acl) {
	const needsAdminRole = acl.userId != userId; // if caller is not same as the record owner, needs admin permissions
	return db.query(AQL`
		// check if user is member of ug-Admin group
		LET ug = (
				FOR mem IN ${db.membershipEdges}
				FILTER mem._from == ${acl.userId} && mem._to == ${db.builtIn.userGroups.Admin} && mem.ugCtx in [null, ${acl.ugCtx}]
				LIMIT 1
				RETURN mem._to
		)
		LET isAdmin = LENGTH(ug) > 0
		LET userId = ${needsAdminRole} ? (isAdmin ? ${userId}: null): ${userId}

		FOR u IN users
		FILTER u._id == userId
		LIMIT 1
		RETURN u
	`).then(cursor => cursor.all());
}

module.exports = {
	name: "iUser",
	methods: {
		"getFullDetails": {
			description: "Resolves all references and returns the complete user-record",
			inputSchema: JOI.object({
				userId: Validators.id
			}),
			outputSchema: JOI.object(),
			fn: getFullDetails
		},
	}
}