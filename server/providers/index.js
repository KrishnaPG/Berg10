/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const Typedef = require('./typedef');
const db = require('../models/db');

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