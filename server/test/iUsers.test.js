/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const axios = require('axios');
const { performance } = require('perf_hooks');
const { app, db, serverReady, shutdown } = require('../index'); // starts a server instance on the test port

const gAxios = axios.create({
	baseURL: `http://${app.get("host")}:${app.get("port")}/api/`,
	timeout: 1000,
});

function rpcInvoke(method, params = {}) {
	return gAxios.post('invoke', {
		jsonrpc: '2.0',
		method,
		params,
		id: performance.now()
	});
}

describe('iUsers functionality', () => {
	let adminUser = null;
	let jwt = null;
	let adminMembership = null;

	beforeAll(done => {
		serverReady.then(() => {
			email = `TestAdmin-${Date.now() * Math.random()}@admin.com`;
			password = confirmPassword = `TestAdminUserPassword#`;
			// create a temporary user
			gAxios.post("user/signup", { appCtx: "Jest.iUsers.AppCtx", email, password, confirmPassword })
				.then(response => {
					jwt = response.data.result.jwt;
					adminUser = response.data.result.user;
					// set the jwt
					gAxios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
					// add the user to the Admin group, irrespective of contexts
					db.membershipEdges.save({ t: new Date(), _from: adminUser[db.idField], _to: db.builtIn.userGroups.Admin })
						.then(membershipRecord => adminMembership = membershipRecord)
						.finally(() => done());
				});
		});
	});
	afterAll(done => {
		// TODO: delete the user properly (with all his resource groups, memberships removed correctly)
		// delete the admin membership and the temporary admin user
		return db.membershipEdges.remove(adminMembership)
			.then(() => db.userColl.remove(adminUser))
			.then(() => {
			// shutdown the servers
			shutdown();
			// give sometime and call done
			setTimeout(done, 1000);
		});
	});

	test('isAdmin', () => {
		return rpcInvoke('iUser.isAdmin').then(axiosResponse => {
			expect(axiosResponse.status).toBe(200);
			expect(axiosResponse.data.jsonrpc).toBe("2.0");
			expect(axiosResponse.data.result).toBe(true);
		});
	});

	test("memberOf", () => {
		return rpcInvoke('iUser.memberOf').then(axiosResponse => {
			expect(axiosResponse.status).toBe(200);
			expect(axiosResponse.data.jsonrpc).toBe("2.0");
			const userGroups = axiosResponse.data.result;
			expect(userGroups).toContain(db.builtIn.userGroups.Everyone);
			expect(userGroups).toContain(db.builtIn.userGroups.Admin);
		});
	});

	test("getFullDetails", () => {
		return rpcInvoke('iUser.getFullDetails').then(axiosResponse => {
			expect(axiosResponse.status).toBe(200);
			expect(axiosResponse.data.jsonrpc).toBe("2.0");
			const userFullRecord = axiosResponse.data.result;
			expect(userFullRecord[db.idField]).toBe(adminUser[db.idField]);
			expect(userFullRecord.password).toBeUndefined();
			console.log(axiosResponse.data);
		});
	});

	// TODO: add user-deletion as invoke method
});