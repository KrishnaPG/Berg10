/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');

module.exports.getValidators = function (normalizedTables) {
	for (let [tbl, tblDefn] of Object.entries(normalizedTables)) {
		//console.log(`${tbl}: ${tblDefn}`);
	}
}