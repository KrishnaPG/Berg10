/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const Typedef = require('./typedef');
const db = require('../models/db');

function getKeyFromUserId(userId) {
	return userId.replace("users/", "");
}

class User {
	static getDefaultRG(userId, appCtx) {
		// the default resource group of user, varies with the appCtx.
		return db.userDefaultRG.firstExample({ _from: userId, appCtx })
			.catch(ex => {
				if (ex.code == 404) return User.createDefaultRG(userId, appCtx);
				throw new Error(`getDefaultRG for user [${userId}] with appCtx [${appCtx}] failed: ${ex.message}`);
			});
	}
	static createDefaultRG(userId, appCtx) {
		// create a system resource-group for the user, under the given appCtx
		return db.resGroupColl.save({
			[db.keyField]: `rg-u${getKeyFromUserId(userId)}-${appCtx}`,
			name: "default",
			description: `Default Resource Group for the user [${userId}] under appCtx [${appCtx}]`
		}).then(resGroup =>
			// set it as the default resource-group for the given appCtx
			db.userDefaultRG.save({ t: new Date(), appCtx }, userId, resGroup[db.idField])
		);
	}
}

class Resource {
	static createNew(resource, acl) {
		// TODO: is the user allowed to create new resources? check permissions
		const t = new Date();
		return Promise.all([
			// create the resource
			db.resourceColl.save(resource),
			// get the default resource group of user under the current appCtx
			getDefaultRG(acl.user.id, acl.appCtx)
			
		]).then(([resRecord, defaultRG]) =>
			Promise.all([
				// assign the resource to the default resource-group of user
				db.resourceBelongsTo.save({ t, rgCtx: acl.rgCtx }, resRecord[db.idField], defaultRG[db.idField]).then(() => defaultRG),
				// create a resource-owner user-group
				db.userGroupColl.save({
					[db.keyField]: `ug-r${resRecord[db.keyField]}-owner`,
					name: `ug-r${resRecord[db.idField]}-owner`,
					description: `Owner group for the resource [${resRecord[db.idField]}]`
				}).then(ownerUG =>
					// add current user to the resource-owner group, irrespective of contexts
					db.membershipEdges.save({ t }, acl.user.id, ownerUG[db.idField]).then(() => ownerUG)
				)
			])
		).then(([defaultRG, ownerUG]) => {
			// give all permissions on defaultRG to the owner group
		});		
	}
}

class UserGroup {
	static createNew({ name, description }) {
		return db.userGroupColl.save({ name, description });
	}
};

class ResourceGroup {
	static createNew({ name, description }) {
		return db.resGroupColl.save({ name, description });
	}
};

module.exports = (req, res, next) => {
	console.log("req.body", req.body);
	next();
}