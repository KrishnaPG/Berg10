/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const chalk = require('chalk');

const { db, waitForAll } = require('./utils');

// gets applied as prefix to all created data items
let gDataPrefix = "";

async function main() {
	// ensure that the user knows what he is doing
	const message = `
This will delete all the data from the Database. Tables, Graphs will be retained.
Launch the program with -y to confirm and override.
Usage: ${process.argv[0]} ${process.argv[1]} -y [gDataPrefix]
		`;
	if (process.argv.length < 3 || process.argv[2] != "-y") {
		console.warn(message);
		process.exit(0);
	}

	// override the prefix as per user preference
	if (process.argv.length > 3)
		gDataPrefix = process.argv[3];

	console.log(chalk.green('[✓]'), "Override confirmed");

	// delete all data from all collections
	db.collections()
		.then(colls => waitForAll(colls, coll =>coll.truncate()))
		.then(() => console.log(chalk.green('[✓]'), "Deleted all the data"))
		.catch(console.error);
}

main();