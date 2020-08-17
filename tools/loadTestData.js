/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const chalk = require('chalk');

const Axios = require('axios');
Axios.defaults.baseURL = `http://${config.server.host}:${config.server.port}/api/`;

// gets applied as prefix to all created data items
let gDataPrefix = "";

// utility functions
const getNoOfDigits = n => (Math.trunc(Math.log10(n)) + 1);
function getAxiosErrorMsg(error) {
	if (error.response) {
		// Vault gives incorrect error code 400, when the client-token is missing
		if (error.response.status <= 401 && error.response.status >= 400) {
			return "UnAuthenticated";
		}
		return error.response.data.error ? error.response.data.error.message : error.response.statusText;
	}
	else {
		// some network error, or server did not respond
		return error.message || error;
	}
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
		p.push(Axios.post("user/signup", { email, password, confirmPassword }).catch(ex => { console.warn("  " + getAxiosErrorMsg(ex))  }));
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
	if (process.argv.length < 3) {
		console.warn(message);
		process.exit(0);
	}

	// override the prefix as per user preference
	if (process.argv.length > 3)
		gDataPrefix = process.argv[3];
	
	console.log(chalk.green('[✓]'), "Arguments validated");

	const rpc = {
		jsonrpc: "2.0",
		method: "invoke",
		params: {
			rid: "typedef",
			method: "createInstance"
		}
	};
	await Axios.post("invoke", rpc)
		.then(console.log)
		.catch(ex => { console.warn("  " + getAxiosErrorMsg(ex)) })

	process.stdout.write("--> Normalizing Tables\r");
	//const builtinTables = normalizeTables(require('../server/models/db_builtinTables'));
	console.log(chalk.green('[✓]'), "Normalizing Tables");

	process.exit(0);
	
	process.stdout.write("--> Creating Users\r");
	await createUsers(5);
	console.log(chalk.green('[✓]'), "Creating Users")

	console.log(chalk.green('[✓]'), "Done");
}

main();