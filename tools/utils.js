/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database } = require('arangojs');
const config = require('config');

const dbConfig = config.db;
const db = new Database(dbConfig);
db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);
module.exports.db = db;

const Axios = require('axios');
Axios.defaults.baseURL = `http://${config.server.host}:${config.server.port}/api/`;
module.exports.Axios = Axios;
module.exports.getAxiosErrorMsg = (error) => {
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

module.exports.waitForAll = (array, fn) => {
	const p = [];
	array.forEach(el => p.push(fn(el)))
	return Promise.all(p);
}