/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');
const localCache = require('./cache');

const UnAuthorized = message => ({ code: 403, message, title: "UnAuthorized" });

// returns the user-groups that the user is memberOf
async function memberOf(db, acl, { userId } = {}) {
	if (!userId)	// if no user is specified, treat the caller as the target
		userId = acl.userId;
	else if (acl.userId !== userId) {	// if caller is not same as the record owner, needs admin permissions
		const isAdmin = await isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.memberOf: Requires Admin Privileges"));
	}
	// run the query and return results
	const cacheKey = `memberOf_${userId}_${acl.ugCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue == 'undefined') {
		return db.query(AQL`
			FOR mem IN ${db.membershipEdges}
			FILTER mem._from == ${userId} && mem.ugCtx in [null, ${acl.ugCtx}]
			RETURN mem._to
		`).then(cursor => cursor.all())
			.then(uGroups => {
				localCache.set(cacheKey, uGroups);
				return uGroups;
			});
	}
	else
		return Promise.resolve(cachedValue);
}

// check if the caller is member of ug-Admin group
function isAdmin(db, acl) {
	const cacheKey = `isAdmin_${acl.userId}_${acl.ugCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue === 'undefined') {
		return memberOf(db, acl).then(uGroups => {
			const isInactive = uGroups.includes(db.builtIn.userGroups.Inactive);
			const isAdmin = uGroups.includes(db.builtIn.userGroups.Admin);
			const result = !isInactive && isAdmin;
			localCache.set(cacheKey, result);
			return result;
		});
	}
	else return Promise.resolve(cachedValue);
}

async function getFullDetails(db, acl, { userId }) {
	if (!userId)	// if no user is specified, treat the caller as the target
		userId = acl.userId;
	else if (acl.userId !== userId) { // if caller is not same as the record owner, needs admin permissions
		const isAdmin = await isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.getFullDetails: Requires Admin Privileges"));
	}
	
	const cacheKey = `getFullDetails_${userId}_${acl.ugCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue === 'undefined') {
		return db.query(AQL`
			FOR u IN ${db.userColl}
			FILTER u._id == ${userId}
			LIMIT 1
			RETURN u
		`).then(cursor => cursor.next())
			.then(userRecord => { delete userRecord.password; return userRecord; });
	}
	else return Promise.resolve(cachedValue);
}

module.exports = {
	name: "iUser",
	methods: {
		"getFullDetails": {
			description: "Resolves all references and returns the complete user-record",
			inputSchema: JOI.object({
				userId: Validators.id.optional()
			}),
			outputSchema: JOI.object(),
			fn: getFullDetails
		},
		"isAdmin": {
			description: "Checks if the caller is a member of an Admin group",
			inputSchema: JOI.object(),
			outputSchema: JOI.boolean(),
			fn: isAdmin
		},
		"memberOf": {
			description: "Returns the userGroups that an user is a memberOf",
			inputSchema: JOI.object({
				userId: Validators.id.optional()
			}),
			outputSchema: JOI.array(),
			fn: memberOf
		},
	}
}