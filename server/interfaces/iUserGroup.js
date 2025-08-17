/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');

function createNew(db, acl, ug) {
	return db.userGroupColl.save(ug).then(ugRecord => {
		return db.userOwnedUG.save({
			t: new Date(), appCtx: acl.appCtx, _from: acl.userId, _to: ugRecord[db.idField]
		})
	});
}

module.exports = {
	name: "iUserGroup",
	methods: {
		"createNew": {
			description: "Creates a new UserGroup for the current user",
			inputSchema: JOI.object({
			}),
			outputSchema: JOI.object(),
			fn: createNew
		}
	}
}