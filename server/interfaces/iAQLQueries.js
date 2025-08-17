/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const JOI = require('joi');
const Validators = require('./validators');
const { Invalid } = require('./errors');

const restrictedOps = ['REMOVE', 'UPDATE', 'REPLACE', 'INSERT', 'UPSERT'];

function exec(db, acl, { query }) {
	const tokens = query.toUpperCase().split(/\s+/);
	if (restrictedOps.some(op => tokens.includes(op)))
		return Promise.reject(Invalid(`Restricted keywords are not allowed in the query: ${JSON.stringify(restrictedOps, null, 2)}`));

	const ugCtxList = acl.ugCtx ? `[null, "${acl.ugCtx}"]` : "[null]";
	return db.query({ query, bindVars: {} }, { count: true, options: { fullCount: true } })
		.then(cursor =>cursor.all());
}

module.exports = {
	name: "iAQLQueries",
	methods: {
		"exec": {
			description: "Returns the results of a query run",
			inputSchema: JOI.object({
				query: JOI.string().min(3).max(4096).required()
			}),
			outputSchema: JOI.object({
			}),
			fn: exec
		},
		"create": {
			description: "Creates a new query",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iAQLQueries.create()'))
		},
		"get": {
			description: "Returns full details of a query",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iAQLQueries.get()'))
		},
		"update": {
			description: "Modifies the query details",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iAQLQueries.update()'))
		},
		"delete": {
			description: "Deletes the query from the system",
			inputSchema: JOI.object(),
			outputSchema: JOI.object(),
			fn: () => Promise.reject(new Error('Not Implemented: iAQLQueries.delete()'))
		},
	},
	description: "The built-in interface for managing AQLQueries"
};