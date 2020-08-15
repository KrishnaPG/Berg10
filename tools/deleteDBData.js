/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database } = require('arangojs');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

const dbConfig = require('config').db;


const db = new Database(dbConfig);

db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

// delete all graphs
db.graphs()
	.then(gphs => gphs.forEach(gph => gph.drop()))
	.then(() => {
		console.log(chalk.green('[✓]'), "Deleted all graphs");
		// delete all collections
		return db.collections().then(colls => colls.forEach(coll => coll.drop()));
	}).then(() => {
		console.log(chalk.green('[✓]'), "Deleted all collections");
	}).catch(console.error);