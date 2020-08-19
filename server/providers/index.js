/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const Typedef = require('./typedef');
const db = require('../models/db');
const { RPCResponse, RPCError } = require('../utils/rpc');

function getKeyFromUserId(userId) {
	return userId.replace("users/", "");
}

class User {
	// Returns the default resource-group Id for the user under the given appCtx
	static getDefaultRG(userId, appCtx) {
		// the default resource group of user, varies with the appCtx.
		return db.userDefaultRG.firstExample({ _from: userId, appCtx })
			.catch(ex => {
				if (ex.code == 404) return User.createDefaultRG(userId, appCtx);
				throw new Error(`getDefaultRG for user [${userId}] with appCtx [${appCtx}] failed: ${ex.message}`);
			}).then(({ _to }) => _to);
	}
	// Returns the newly created 
	static createDefaultRG(userId, appCtx) {
		// create a system resource-group for the user, under the given appCtx
		return db.resGroupColl.save({
			[db.keyField]: `rg-def-u${getKeyFromUserId(userId)}-${appCtx}`,
			name: "default",
			description: `Default Resource Group for the user [${userId}] under appCtx [${appCtx}]`
		}).then(resGroup =>
			// set it as the default resource-group for the user for the given appCtx
			db.userDefaultRG.save({ t: new Date(), appCtx }, userId, resGroup[db.idField]).then(savedRecord => {
				savedRecord._from = userId;
				savedRecord._to = resGroup[db.idField]
				return savedRecord;
			})
		);
	}
}

class Resource {
	static createNew(resource, acl) {
		// TODO: is the user allowed to create new resources? check permissions
		// TODO: update the resource.ownerUG 
		const t = new Date(), userId = acl.user[db.idField];
		return Promise.all([
			// create the resource
			db.resourceColl.save(resource),
			// get the default resource group of user under the current appCtx
			User.getDefaultRG(userId, acl.appCtx)
			
		]).then(([resRecord, defaultRGId]) =>
			Promise.all([
				// assign the resource to the default resource-group of user
				db.resourceBelongsTo.save({ t, rgCtx: acl.rgCtx }, resRecord[db.idField], defaultRGId).then(() => defaultRGId),
				// create a resource-owner user-group
				db.userGroupColl.save({
					[db.keyField]: `ug-r${resRecord[db.keyField]}-owner`,
					name: `ug-r${resRecord[db.idField]}-owner`,
					description: `Owner group for the resource [${resRecord[db.idField]}]`
				}).then(ownerUG =>
					// add current user to the resource-owner group, irrespective of contexts
					db.membershipEdges.save({ t }, userId, ownerUG[db.idField]).then(() => ownerUG[db.idField])
				)
			])
		).then(([defaultRGId, ownerUGId]) => 
			db.resGroupMethods.save({
				rg: defaultRGId,
				type: resource.type,
				method: ".+",	// all methods
				permit: "allow"
			}).then(resGroupMethod => 
				// give all permissions on defaultRG to the owner group
				db.permissionEdges.save({ t, permCtx: acl.permCtx }, ownerUGId, resGroupMethod[db.idField])
			)
		);
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
	const rpcRequest = req.body;
	const acl = {
		user: rpcRequest.params.user,
		rgCtx: "defRGCtx",
		ugCtx: "defUGCtx",
		permCtx: "defPermCtx",
		appCtx: "defAppCtx"
	};
	Resource.createNew(rpcRequest.params.resource, acl)
		.then(resource => res.send(RPCResponse(resource)))
		.catch(ex => res.status(ex.code || 500).send(RPCError(ex)));
}