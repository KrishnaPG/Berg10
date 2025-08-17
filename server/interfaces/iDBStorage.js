/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');

const iDBEntry = {
	list: (params) => { },
	read: params => { },
	write: params => { }
};

module.exports.init = () => {
	// ensure the interface exists in the records
	return {
		provides: "interfaces/iDBEntry",	// the record id
		methods: iDBEntry
	}
}