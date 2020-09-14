/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');

function find(db, { filter, limit = 10, skip = 0, sort = {} }, acl) {
	const ugCtxList = acl.ugCtx ? `[null, "${acl.ugCtx}"]` : "[null]";
	const filterExpr = AQL.literal("");//Typedef.convertFilter(filter));
	//const sortExpr = AQL.literal(`SORT r.${sort} ${desc ? "DESC" : "ASC"}`);
	return db.query(AQL`
			// check if user is member of ug-Admin group
			LET ug = (
					FOR mem IN ${db.membershipEdges}
					FILTER mem._from == ${acl.userId} && mem._to == ${db.builtIn.userGroups.Admin} && mem.ugCtx in ${ugCtxList}
					LIMIT 1
					RETURN mem._to
			)
			LET isAdmin = LENGTH(ug) > 0
			
			FOR u IN ${db.userColl}
			FILTER isAdmin || u._id == ${acl.userId}
			LIMIT ${skip}, ${limit}
			RETURN u
	`, { count: true, options: { fullCount: true } })
		.then(cursor =>
			cursor.all().then(users => ({
				total: (cursor.extra.stats.fullCount || cursor.count),
				limit,
				skip,
				data: users
			}))
		);

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
			inputSchema: JOI.object({
				filter: JOI.any(),
				limit: JOI.number().positive().default(10).min(1).max(125),
				skip: JOI.number().integer().default(0).min(0),
				sort: JOI.any()
			}),
			outputSchema: JOI.object({
				total: JOI.number().integer(),
				limit: JOI.number().integer(),
				skip: JOI.number().integer(),
				data: JOI.array().items(JOI.object())
			}),
			fn: find
		},
		"create": {
			description: "Creates a new user",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.create()'))
		},
		"get": {
			description: "Returns full details of a user",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.get()'))
		},
		"update": {
			description: "Modifies the user details",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.update()'))
		},
		"delete": {
			description: "Deletes the user from the system",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iUsers.delete()'))
		},

	},
	description: "The built-in interface for managing Users"
};