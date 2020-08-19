/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const chalk = require('chalk');
const { db, Axios, getAxiosErrorMsg } = require('./utils');
debugger;

// gets applied as prefix to all created data items
let gDataPrefix = "";

// utility functions
const getNoOfDigits = n => (Math.trunc(Math.log10(n)) + 1);

function createResource(type, user) {
	const rpc = {
		jsonrpc: "2.0",
		method: "invoke",
		params: {	user,	resource: { type }	}
	};
	return Axios.post("invoke", rpc);
}

// create few resources
async function createResources(users) {
	const printerMethods = [
		{
			name: "print", inputs: {}, outputs: {}, typedef: "tPrinter", [db.keyField]: "_tPrinter.print"
		},
		{
			name: "scan", inputs: {}, outputs: {}, typedef: "tPrinter", [db.keyField]: "_tPrinter.scan"
		},
		{
			name: "fax", inputs: {}, outputs: {}, typedef: "tPrinter", [db.keyField]: "_tPrinter.fax"
		}
	];
	await Promise.all(printerMethods.map(method => db.ensureRecord(db.typeMethodsColl, method)));
	return Promise.all(users.map(user => createResource("tPrinter", user)));
}

// create bulk users
function createUsers(n = 20) {
	const p = [];
	const nDigits = getNoOfDigits(n); // no. of digits in n
	let email, password, confirmPassword;
	for (let i = 1; i <= n; ++i)
	{
		email = `${gDataPrefix}user${i.toString().padStart(nDigits, "0")}@test.abc`;
		password = confirmPassword = `${gDataPrefix}userPassword#`;
		p.push(Axios.post("user/signup", { email, password, confirmPassword }).then(response => response.data.result.user));
	}
	return Promise.all(p);
}

const delay = t => new Promise((resolve, reject) => setTimeout(resolve, t));

async function main() {
	// ensure that the user knows what he is doing
	const message = `
This will overwrite any existing data present in the Database.
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
	
	process.stdout.write("--> Initializing the Database\r");
	await db.init();
	console.log(chalk.green('[✓]'), "Initializing the Database");

	process.stdout.write("--> Creating Users\r");
	const users = await createUsers(5);
	console.log(chalk.green('[✓]'), "Creating Users");

	process.stdout.write("--> Creating Resources\r");
	await createResources(users);
	console.log(chalk.green('[✓]'), "Creating Resources");

	console.log(chalk.green('[✓]'), "Done");
}

main().catch(ex => console.warn(getAxiosErrorMsg(ex)));