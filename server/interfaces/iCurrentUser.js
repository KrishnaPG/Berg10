/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');
const localCache = require('./cache');

// returns the user-groups that the current user is memberOf, for the current ugCtx
async function memberOf(db, acl) {
	const userId = acl.userId;
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

// returns the default-resource-group for the current-user under the current appCtx;
// Each user has one default RG for each appCtx, assigned by the system
function defResourceGroup(db, acl) {
	const userId = acl.userId;
	const cacheKey = `defRG_${userId}_${acl.appCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue == 'undefined') {
		return db.query(AQL`
			FOR rg IN ${db.userDefaultRG}
			FILTER rg._from == ${userId} && rg.appCtx == ${acl.appCtx}
			LIMIT 1
			RETURN rg._to
		`).then(cursor => cursor.next())
			.then(defRG => {
				localCache.set(cacheKey, defRG);
				return defRG;
			});
	}
	else
		return Promise.resolve(cachedValue);
}

// returns the list of resources owned by the current user, under the current ugCtx
function ownedResources(db, acl) {
	const userId = acl.userId;
	const cacheKey = `ownedResources_${userId}_${acl.ugCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue == 'undefined') {
		return db.query(AQL`
			FOR mem IN ${db.membershipEdges}
			 FILTER mem._from == ${userId} && mem.ugCtx in [null, ${acl.ugCtx}]
			 FOR r IN resources
				FILTER r.ownerUG == m._to
			RETURN r
		`).then(cursor => cursor.all())
			.then(resources => {
				localCache.set(cacheKey, resources);
				return resources;
			});
	}
	else
		return Promise.resolve(cachedValue);
}