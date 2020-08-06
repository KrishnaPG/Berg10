/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database } = require('arangojs');

const dbConfig = require('config').db;
const { normalizeTables, isGeoType } = require('./db_schemaNormalization');
const { getValidators } = require('./db_schemaValidation');

const db = new Database(dbConfig);
db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

const err = (msg, ex) => { throw new Error(" Context: " + msg + ", " + ex.stack); };
const createColl = name => {
	const coll = db.collection(name);
	return coll.exists().then(exists =>
		exists ? coll : coll.create({ waitForSync: true }).then(() => coll).catch(ex => err("createColl('" + name + "')", ex))
	);
};

function ensureIndices(c, tbl, tblDefn) {
	const p = [];
	for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		if (fldDefn.index) {
			const uniqueSparse = { unique: fldDefn.unique, sparse: fldDefn.sparse };
			if (isGeoType(fldDefn.type) || fldDefn.index === "geo")
				p.push(c.ensureIndex({ type: "geo", fields: [fld], geoJson: true, ...uniqueSparse })
					.catch(ex => err(`ensureIndex('${tbl}.${fld}'), geo`, ex)));
			else if (fldDefn.type.toLowerCase() === "text" || fldDefn.index === "fullText")
				p.push(c.ensureIndex({ type: "fulltext", fields: [fld], minLength: 3, ...uniqueSparse })
					.catch(ex => err(`ensureIndex('${tbl}.${fld}), fulltext`, ex)));
			else
				p.push(c.ensureIndex({ type: "persistent", fields: [fld], ...uniqueSparse })
					.catch(ex => err(`ensureIndex('${tbl}.${fld}')`, ex)));
		}
	}
	return Promise.all(p);
}


function ensureTables(builtinTables) {
	const p = [];
	for (let [tbl, tblDefn] of Object.entries(builtinTables)) {
		p.push(createColl(tbl).then(coll => ensureIndices(coll, tbl, tblDefn)));
	}
	return Promise.all(p);
}

function ensureTypeRecord(typeDefColl, key, typeDefn) {
	return typeDefColl.firstExample({ [dbConfig.keyField]: key }).catch(ex => {
		if (ex.code == 404) {
			// whenever the db_builtinTables.js is changed, ensure to update this code
			return typeDefColl.save({
				[dbConfig.keyField]: key,
				name: key,
				schema: JSON.stringify(typeDefn),
				private: false
			});
		}
		err("ensureTypeRecord", ex);
	});
}

module.exports = db;

module.exports.init = function () {
	const builtinTables = normalizeTables(require('./db_builtinTables'));
	const tableValidators = getValidators(builtinTables);
	console.log("validators: ", tableValidators);
	//return Promise.reject("-----some error------");
	return ensureTables(builtinTables).then(() => {
		const userColl = db.collection("users");
		const typeDefColl = db.collection("typedef");
		module.exports.userColl = userColl;
		module.exports.typeDefColl = typeDefColl;
		return ensureTypeRecord(typeDefColl, "schepe", builtinTables["typedef"]);
	});
}

module.exports.idField = dbConfig.idField;
module.exports.keyField = dbConfig.keyField;
module.exports.rayField = dbConfig.rayField;