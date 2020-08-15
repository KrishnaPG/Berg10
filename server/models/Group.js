/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const db = require('./db');

class Group { 
	static create(grp) {
		return db.groupColl.save(grp).then
	}
};

module.exports = Group;