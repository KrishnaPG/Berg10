/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');

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
		}
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