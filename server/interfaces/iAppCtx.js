/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { rpcMethods: ProviderMethods } = require('../interfaces/');
	
// check if the caller is member of system-wide ug-Admin group
function isSystemAdmin(db, acl) {

}

// this method can be invoked only through local script tools.
// 1. signup as a user from the webUI
// 2. launch the createAppCtx
async function createNew(db, acl, appCtxObj) {
	// check if current user is system-wide admin
	// const isAdmin = await CurrentUser.isAdmin(db, acl);
	// if (!isAdmin) return Promise.reject(UnAuthorized("iUser.defResourceGroup: Requires Admin Privileges"));

	// ensure this is a new record
	const ctxKey = "appCtx" + Math.ceil(Math.random() * performance.timeOrigin + performance.now()).toString(36);;
	appCtxRecord[db.keyField] = ctxKey;

	return db.appCtxColl.save(appCtxObj).then(appCtxRecord => {
		const p = [];
		// create adminUG specific for this appCtx
		p.push(ProviderMethods["iUserGroup.createNew"].fn(db, {
			userId: db.builtIn.users.System,
			appCtx: appCtxRecord[db.idField]
		}, {
			[db.keyField]: `ug-Admin-${ctxKey}`,
			name: `Admin-${ctxKey}`,
			description: `Admin userGroup for ${ctxKey}`
		}));
		// create LoginUG specific for this appCtx

		// Should the system-user be added as part of this new AdminUG of this appCtx ??
	});
	


	iUserGroup.createNew
	builtIn.users.System
}