/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { performance } = require('perf_hooks');

const db = require('../models/db');
const { RPCResponse, RPCError } = require('../utils/rpc');

const randomId = () => Math.ceil(Math.random() * performance.timeOrigin + performance.now()).toString(36).padStart(8, "0"); // minimum 8 chars id

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
			[db.keyField]: `rg-u${getKeyFromUserId(userId)}-${appCtx}`,
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
		const t = new Date(), userId = acl.user[db.idField];
		
		// TODO: for the resource of given type, get its consistent hash as the resourceKey
		const resourceKey = `r${randomId()}`;
		const ugResOwnerKey = `ug-${resourceKey}-owner`;
		resource[db.keyField] = resourceKey;
		resource["ownerUG"] = `userGroups/${ugResOwnerKey}`; // record for this will be created later below

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
					[db.keyField]: ugResOwnerKey,
					name: ugResOwnerKey,
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
	// creates a new user-group and adds the list of users to that group.
	// TODO: security
	//	1. check if user is allowed to create user-Groups
	//	2. ensure the members have given consent to be added to the group(some kind of token from them)
	static createNew({ name, description }, memberUserIds, acl) {
		return db.userGroupColl.save({ name, description }).then(uGroup => {
			const t = new Date(), groupId = uGroup[db.idField], userId = acl.user[db.idField];
			// mark the creator for the group
			const p1 = db.userOwnedUG.save({ t, appCtx: acl.appCtx }, userId, groupId);
			// add the members to the group
			const p2 = memberUserIds.map(memId => db.membershipEdges.save({ t, ugCtx: acl.ugCtx }, memId, groupId));
			return Promise.all([p1, ...p2]);
		});
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
	switch (rpcRequest.method) {
		case "Resource.createNew": {
			return Resource.createNew(rpcRequest.params.resource, acl)
				.then(resource => res.send(RPCResponse(resource)))
				.catch(ex => res.status(ex.code || 500).send(RPCError(ex)));
		}
		case "UserGroup.createNew": {
			return UserGroup.createNew(rpcRequest.params.group, rpcRequest.params.memberIds, acl)
				.then(result => res.send(RPCResponse(result)))
				.catch(ex => res.status(ex.code || 500).send(RPCError(ex)));
		}
		default: {
			return res.status(404).send(RPCError.notFound(`Unknown Method: ${rpcRequest.method}`));
		}
	}
}