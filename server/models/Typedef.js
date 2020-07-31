/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const db = require('./db');

class Typedef {
	static findOne(query, cb = (err, typeDef) => { }) {
		return db.typeDefColl.firstExample(query).then(typeDef => cb(null, typeDef)).catch(ex => {
			if (ex.code == 404) return cb(null, null);
			cb(ex);
		});
	}
}

module.exports = Typedef;