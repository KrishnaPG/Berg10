/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');
const localCache = require('./cache');

// check if the caller is member of ug-Admin group
function isAdmin(db, acl) {
	const cacheKey = `isAdmin_${acl.userId}-${acl.ugCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue == 'undefined') {
		return db.query(AQL`
			FOR mem IN ${db.membershipEdges}
			FILTER mem._from == ${acl.userId} && mem._to == ${db.builtIn.userGroups.Admin} && mem.ugCtx in [null, ${acl.ugCtx}]
			LIMIT 1
			RETURN mem._to
		`).then(cursor => {
			const retVal = cursor.hasNext;
			cursor.kill();
			localCache.set(cacheKey, retVal);
			return retVal;
		}).catch(ex => console.error(ex));
	}
	else
		return Promise.resolve(cachedValue);
}

function getFullDetails(db, acl, { userId }) {
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
		"isAdmin": {
			description: "Checks if the caller is a member of a Admin group",
			inputSchema: JOI.object(),
			outputSchema: JOI.boolean(),
			fn: isAdmin
		},
	}
}