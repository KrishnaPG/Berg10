/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database } = require('arangojs');

const dbConfig = require('config').db;

const db = new Database(dbConfig);

db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

module.exports = db;

module.exports.init = function () {
	const userColl = db.collection(dbConfig.userTable);
	module.exports.userColl = userColl;
	return userColl.exists().then(exists => exists ? userColl : userColl.create({ waitForSync: true }));
}

module.exports.idField = dbConfig.idField;
module.exports.keyField = dbConfig.keyField;
module.exports.rayField = dbConfig.rayField;