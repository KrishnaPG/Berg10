const { Database } = require('arangojs');

const dbConfig = require('config').db;

const db = new Database(dbConfig);

db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

module.exports = db;