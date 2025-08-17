const config = require('config');
const chalk = require('chalk');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const { db, Axios, getAxiosErrorMsg } = require('./utils');

const optionDefinitions = [
  { name: 'users', alias: 'u', type: String, multiple: true, defaultOption: false },
	{ name: 'appCtx', alias: 'a', type: String, multiple: false },
	{ name: 'remove', alias: 'r', type: Boolean, multiple: false }
];

const usage = commandLineUsage([
	{
		header: 'Make User Admin',
		content: "Adds an user to the Admin userGroup. User should already exist in the system. Multiple users can be specified. If an appCtx is specified, the users will be made Admin of that appCtx (rather than system-wide Admin)."
	},
	{
		header: 'Options',
		optionList: [
			{
				name: 'appCtx',
				description: '[Optional] The appCtx to which the users should be made admin of. If not specified, the users will be made system-wide Admin.',
				alias: 'a',				
				type: String,
				multiple: false,				
				typeLabel: '{underline string}'
			},
			{
				name: 'users',
				description: '[Required] The users that should be made admin. At least one user should be specified.',
				alias: 'u',
				type: String,
				multiple: true,
				defaultOption: false,
				typeLabel: '{underline eMail} ...'
			},			
			{
				name: 'remove',
				description: '[Optional] If specified, removes the users from the Admin group.',
				alias: 'r',
				type: Boolean,
				typeLabel: '{underline boolean}'
			},
		]
	},
	{
		header: 'Example',
		content: "makeUserAdmin.js -a appCtx1 -u user1@email.com user2@abc.com user3@xyz.co"
	}
]);


async function main() {

	const options = commandLineArgs(optionDefinitions);

	if (!options.users || options.users.length <= 0) {
		console.error(usage, chalk.red('\nError'), ": At least one user must be specified \n");
		process.exit(0);
	}
	if (options.appCtx === null) {
		console.error(usage, chalk.red('\nError'), ": appCtx option is used but no valid value was supplied\n");
		process.exit(0);
	}

	console.log(options);

	process.stdout.write("--> Initializing the Database\r");
	await db.init();
	console.log(chalk.green('[✓]'), "Initializing the Database");	

	let appCtxRecord = {};
	let adminUG = db.builtIn.userGroups.Admin;
	const userEMails = options.users;
	const appCtx = options.appCtx ? options.appCtx: null;
	if (appCtx) {
		process.stdout.write("--> Evaluating the appCtx\r");
		appCtxRecord = await db.appCtxColl.document(appCtx).catch(ex => {
			if (ex.code == 404) throw new Error(`Unknown appCtx "${appCtx}".`);
			else throw ex;
		});
		adminUG = appCtxRecord.adminUG;
		console.log(chalk.green('[✓]'), "Evaluating the appCtx");
	}

	for (let i = 0; i < userEMails.length; ++i) {
		let status = "";
		process.stdout.write(`--> [${userEMails[i]}] --> Admin\r`);
		
		const userRecord = await db.userColl.firstExample({ email: userEMails[i] }).catch(ex => {
			if (ex.code == 404) console.log(chalk.yellow(userEMails[i]), ": user not found");
			else throw ex;
		});
		if (!userRecord) continue;

		{ // add to admin group
			const membershipRecord = { ugCtx: null, _from: userRecord[db.idField], _to: adminUG };

			const alreadyMember = await db.membershipEdges.collection.firstExample(membershipRecord).catch(ex => {
				if (ex.code == 404) return false;
				throw ex;
			});
			if (alreadyMember) {
				if (options.remove) await db.membershipEdges.remove(alreadyMember).then(() => status = "Removed");
				else {
					console.log(chalk.yellow(userEMails[i]), ": user already an Admin. Skipping...");
					continue;
				}
			} else { // not a member yet
				if (!options.remove)
					await db.membershipEdges.save(membershipRecord).then(() => status = "Added");
			}
		}

		if (appCtx && !options.remove) { // add to login-group of appCtx
			const membershipRecord = { ugCtx: null, _from: userRecord[db.idField], _to: appCtxRecord.loginUG };

			const alreadyMember = await db.membershipEdges.collection.firstExample(membershipRecord).catch(ex => {
				if (ex.code == 404) return false;
				throw ex;
			});
			if (!alreadyMember)	await db.membershipEdges.save(membershipRecord);
		}
		// when we are removing from adminGroup of an appCtx, we do NOT remove the user from loginUG
		
		console.log(chalk.green('[✓]'), `[${userEMails[i]}] --> Admin: [${status}]`);
	}

	return db.close();
}

main().catch(ex => console.error(chalk.red("\nError: "), getAxiosErrorMsg(ex)));