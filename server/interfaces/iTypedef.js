/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');
const { NotFound } = require('./errors');

const schema = JOI.object({
	name: JOI.string().required().min(1).max(32),
	schema: JOI.string().required().min(2),
	private: JOI.boolean().default(true)
});

module.exports = {
	name: "iTypedef",
	methods: {
		"createInstance": {
			description: "Allows you to define a new type",
			inputSchema: JOI.object({}),
			outputSchema: JOI.object(),
			fn: createInstance
		},
		// "findOne": {
		// 	description: "Find a type",
		// 	inputSchema: JOI.object({}),
		// 	outputSchema: JOI.object(),
		// 	fn: findOne
		// }
	},
	description: "The built-in typedef interface"
};

function createInstance(db, acl, { type, ...other}) {
	providers["table"].createNewEntry("resources", { type, ...others }).then(resource => {
		createUserGroup(resource.name + ".owner").then(grp => {
			addUserToGroup(currentUser, grp); // add user as owner of the resource
		})
		addResourceToGroup(resource, someResourceGroup || "default");
	});
}

// function findOne(db, acl, query) {
// 	return db.typeDefColl.firstExample(query).then(results => {
// 		if (!results) throw NotFound(`No typeDef record exists for the query:\n ${JSON.stringify(query, null, " ")}`);
// 		return results;
// 	});
// }