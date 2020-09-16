/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const CurrentUser = require('./iCurrentUser');
const localCache = require('./cache');
const Validators = require('./validators');

const UnAuthorized = message => ({ code: 403, message, title: "UnAuthorized" });

// returns the user-groups that the user is a memberOf, across all ugCtx
async function memberOf(db, acl, { userId } = {}) {
	// if no user is specified, treat the caller as the target
	if (!userId) return CurrentUser.memberOf(db, acl);
	
	// if caller is not same as the record owner, needs admin permissions
	if (acl.userId !== userId) {	
		const isAdmin = await CurrentUser.isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.memberOf: Requires Admin Privileges"));
	}

	// list the userGroup memberships for the given user, groupedBy ugCtx
	const cacheKey = `memberOf_${userId}_${acl.appCtx}`;
	const cachedValue = localCache.get(cacheKey);
	if (typeof cachedValue == 'undefined') {
		return db.query(AQL`
			FOR mem IN ${db.membershipEdges}
			FILTER mem._from == ${userId} 
			COLLECT ugCtx = mem.ugCtx INTO ugByCtx
			RETURN {
				ugCtx,
				userGroups: ugByCtx[*].mem._to
			}
		`).then(cursor => cursor.all())
			.then(uGroups => {
				localCache.set(cacheKey, uGroups);
				return uGroups;
			});
	}
	else
		return Promise.resolve(cachedValue);
}

// returns the defaultRG for the given user, under the current appCtx
async function defResourceGroup(db, acl, { userId }) {
	// if no user is specified, treat the caller as the target
	if (!userId) return CurrentUser.defResourceGroup(db, acl);	

	// if caller is not same as the record owner, needs admin permissions
	if (acl.userId !== userId) { 
		const isAdmin = await CurrentUser.isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.defResourceGroup: Requires Admin Privileges"));
	}
	// impersonate the other user and query for the default-RG.
	// This works, since a defaultRG exists per appCtx (and does not vary with ugCtx or rgCtx etc.)
	const tempACL = Object.assign({}, acl, { userId });
	return CurrentUser.defResourceGroup(db, tempACL);
}

// returns the list of resources owned by the given user, across all ugCtx 
async function ownedResources(db, acl, { userId }) {
	// if no user is specified, treat the caller as the target
	if (!userId) return CurrentUser.ownedResources(db, acl);

	// if caller is not same as the record owner, needs admin permissions
	if (acl.userId !== userId) {
		const isAdmin = await CurrentUser.isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.ownedResources: Requires Admin Privileges"));
	}

}

async function getFullDetails(db, acl, { userId }) {
	// if no user is specified, treat the caller as the target
	if (!userId) userId = acl.userId;
	
	// if caller is not same as the record owner, needs admin permissions
	if (acl.userId !== userId) { 
		const isAdmin = await CurrentUser.isAdmin(db, acl);
		if (!isAdmin) return Promise.reject(UnAuthorized("iUser.getFullDetails: Requires Admin Privileges"));
	}

	const cacheKey = `getFullDetails_${userId}_${acl.appCtx}`;
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

function hashPassword(user) {
	if (!user.password) return Promise.resolve(user);
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(10, (err, salt) => {
			if (err) { return reject(err); }
			bcrypt.hash(user.password, salt, (err, hash) => {
				if (err) { return reject(err); }
				user.password = hash;
				resolve(user);
			});
		});
	});
}

async function createNew(db, acl, user) {
	// ensure admin privileges
	const isAdmin = await CurrentUser.isAdmin(db, acl);
	if (!isAdmin) return Promise.reject(UnAuthorized("iUser.createNew: Requires Admin Privileges"));

	return hashPassword(user).then(user => {
		// ensure this is a new user and caller is not trying to update an existing record
		delete user[db.idField];
		// save the record to DB
		return db.userColl.save(user)
			.then(userRecord => {
				const t = new Date();
				// add user to "Everyone" user-group (irrespective of appCtx)
				// Everyone includes, all users across all appCtx, which serve as Guests in other appCtx
				const p1 = db.membershipEdges.save({ t, _from: userRecord[db.idField], _to: db.builtIn.userGroups.Everyone });
				// create a default resource-group for the user 
				const p2 = db.resGroupColl.save({
					[db.keyField]: `rg-u${userRecord[db.keyField]}-${appCtx}`,
					name: "default",
					description: `Default Resource Group for the user [${userRecord[db.idField]}] under appCtx [${appCtx}]`
				}).then(resGroup =>
					// assign the defaultRG to the user under the current appCtx
					db.userDefaultRG.save({ t, appCtx, _from: userRecord[db.idField], _to: resGroup[db.idField] })
				);
				return Promise.all([p1, p2]).then(() => userRecord);
			});
		// TODO: add to LoginUsers group, if required
	})
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
			outputSchema: JOI.array(JOI.object({
				ugCtx: JOI.string(),
				userGroups: JOI.array(JOI.string())
			})),
			fn: memberOf
		},
	}
}