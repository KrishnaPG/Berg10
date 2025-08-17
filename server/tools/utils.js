/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
module.exports.db = require('../models/db');

const Axios = require('axios');
Axios.defaults.baseURL = `http://127.0.0.1:${config.port}/api/`;
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