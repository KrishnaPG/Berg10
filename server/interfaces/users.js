/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const db = require('../models/db');
const { RPCResponse, RPCError } = require('../utils/rpc');

function find({ filter, limit = 20, offset = 0, sort = {} }, acl) {
	const ugCtxList = acl.ugCtx ? `[null, "${acl.ugCtx}"]` : "[null]";
	const filterExpr = AQL.literal("");//Typedef.convertFilter(filter));
	//const sortExpr = AQL.literal(`SORT r.${sort} ${desc ? "DESC" : "ASC"}`);
	return db.query(AQL`
			// check if user is member of ug-Admin group
			LET ug = (
					FOR mem IN \`${db.collName.memberOf}\`
					FILTER mem._from == \'${acl.userId}\' && mem._to == \'${builtIn.userGroups.Admin}\' && mem.ugCtx in ${ugCtxList}
					LIMIT 1
					RETURN mem._to
			)
			LET isAdmin = LENGTH(ug) > 0
			LET u = (
					FOR u IN \`${db.collName.users}\`
					FILTER isAdmin || u._id == @userId
					LIMIT ${offset}, ${limit}
					RETURN u
			)
			RETURN { users: u,  isAdmin }
	`).then(cursor => cursor.all());

	/* Ref: https://www.arangodb.com/docs/stable/drivers/js-reference-aql.html
			FOR u IN `users`
			FILTER u.active == true AND u.gender == "f"
			SORT u["age"] ASC
			LIMIT 5
			RETURN u
	*/
}	

module.exports = {
	name: "iUsers",
	methods: {
		"find": {
			description: "Returns the list of users that meet the given search criteria",
			inputSchema: {},
			outputSchema: {},
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.find()'))
		},
		"create": {
			description: "Creates a new user",
			inputSchema: {},
			outputSchema: {},
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.create()'))
		},
		"get": {
			description: "Returns full details of a user",
			inputSchema: {},
			outputSchema: {},
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.get()'))
		},
		"update": {
			description: "Modifies the user details",
			inputSchema: {},
			outputSchema: {},
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.update()'))
		},
		"delete": {
			description: "Deletes the user from the system",
			inputSchema: {},
			outputSchema: {},
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.delete()'))
		},

	},
	description: "The built-in interface for managing Users"
};