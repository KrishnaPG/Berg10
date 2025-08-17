/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const NodeCache = require("node-cache");

module.exports = new NodeCache({
	stdTTL: 15,	// seconds
	useClones: false,
	deleteOnExpire: true,
	checkperiod: 3601,	//seconds; periodic check for deleting the expired keys. useful for rarely accessed expired keys.
});