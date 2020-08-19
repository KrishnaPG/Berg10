/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const chalk = require('chalk');
const { db, waitForAll } = require('./utils');

async function main() {

	// ensure that the user knows what he is doing
	const message = `
This will delete everything from the Database including tables and graphs.
Launch the program with -y to confirm and delete everything.
Usage: ${process.argv[0]} ${process.argv[1]} -y
		`;
	if (process.argv.length < 3 || process.argv[2] != "-y") {
		console.warn(message);
		process.exit(0);
	}

	console.log(chalk.green('[✓]'), "Override confirmed");

	// delete all graphs
	await db.graphs()
		.then(gphs => waitForAll(gphs, gph => gph.drop()))
		.then(() => console.log(chalk.green('[✓]'), "Deleted all graphs"))
		.then(() => db.collections())
		.then(colls => waitForAll(colls, coll => coll.drop())) // delete all collections
		.then(() => console.log(chalk.green('[✓]'), "Deleted all collections"))
		.catch(console.error);
}

main();