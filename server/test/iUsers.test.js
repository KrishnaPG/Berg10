/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const axios = require('axios');
const { app, db, serverReady, shutdown} = require('../index'); // starts a server instance on the test port

describe('iUsers functionality', () => {
	const gAxios = axios.create({
		baseURL: `http://${app.get("host")}:${app.get("port")}/api/`,
		timeout: 2500,
	});
	let adminUser = null;
	let jwt = null;
	let adminMembership = null;

	beforeAll(done => {
		serverReady.then(() => {
			email = `TestAdmin-${Date.now() * Math.random()}@admin.com`;
			password = confirmPassword = `TestAdminUserPassword#`;
			// create a temporary user
			gAxios.post("user/signup", { email, password, confirmPassword })
				.then(response => {
					jwt = response.data.result.jwt;
					adminUser = response.data.result.user;
					// set the jwt
					gAxios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
					// add the user to the Admin group, irrespective of contexts
					db.membershipEdges.save({ t: new Date() }, adminUser[db.idField], db.builtIn.userGroups.Admin)
						.then(membershipRecord => adminMembership = membershipRecord)
						.then(() => done());
				});
		});
	});
	afterAll(done => {
		// TODO: delete the user properly (with all his resource groups, memberships removed correctly)
		// delete the admin membership and the temporary admin user
		db.membershipEdges.remove(adminMembership)
			.then(() => db.userColl.remove(adminUser))
			.then(() => {
			// shutdown the servers
			shutdown();
			// give sometime and call done
			setTimeout(done, 1000);
		});
	});

	test('test1', done => {
		gAxios.post('typedefs', {
			name: `test-${(new Date()).toString()}`
		}).then(response => gAxios.get('typedefs?name=schepe'))
			.then(response => console.log(response.data)).then(() => done());
	});
	// TODO: add user-deletion as invoke method
});