/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database } = require('arangojs');

const dbConfig = require('config').db;
const { normalizeTables, isGeoType, isRelationTable } = require('./db_schemaNormalization');
const { getValidators } = require('./db_schemaValidation');
const registerInterfaces = require('../interfaces/');

const RelationGraphName = "system_relations";

const db = new Database(dbConfig);
db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

const err = (msg, ex) => { throw new Error(msg + ", " + ex.stack); };
const createColl = name => {
	const coll = db.collection(name);
	return coll.exists().then(exists =>
		exists ? coll : coll.create({ waitForSync: true }).then(() => coll).catch(ex => err(`createColl('${name}')`, ex))
	);
};

const createEdgeColl = (edgeName, fromName, toName, g) => {
	const coll = db.edgeCollection(edgeName);
	return coll.exists().then(exists => {
		if (exists) return coll;
		return coll.create({ waitForSync: true })
			.then(() => g.addEdgeDefinition({ collection: edgeName, from: [fromName], to: [toName] }))
			.then(() => coll)
			.catch(ex => err(`createEdgeColl('${edgeName}': '${fromName}' -> '${toName}')`, ex));
	});
}; 

function ensureEdgeRelations(g, builtinTables) {
	const p = [];
	for (let [tbl, tblDefn] of Object.entries(builtinTables)) {
		if (isRelationTable(tbl)) continue;

		for (let [fld, fldDefn] of Object.entries(tblDefn)) {
			if (fldDefn.foreignKey && fldDefn.isArray) {
				// insert an edge between tbl and fld.type collections with tbl.fld as the name of relation
				// there could be multiple edges for the same relation. E.g. person -> [addresses]
				const from = tbl;
				const to = fldDefn.type;
				const edgeName = fld;
				p.push(createEdgeColl(edgeName, from, to, g));
			}
		}
	}
	return Promise.all(p);
}

function ensureGraphExists(g) {
	return g.exists().then(exists => exists ? g : g.create({}));
}

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
		if (isRelationTable(tbl)) continue;
		p.push(createColl(tbl).then(coll => ensureIndices(coll, tbl, tblDefn)));
	}
	return Promise.all(p);
}

function ensureRecord(coll, record) {
	return coll.firstExample({ [dbConfig.keyField]: record[dbConfig.keyField] }).catch(ex => { 
		if (ex.code == 404) 
			return coll.save(record, { waitForSync: true });
		err(`ensureRecord('${coll.name}','${record[dbConfig.keyField]}')`, ex);
	});
}

function ensureCustomIndices() {
	// specific indices on graph edges that are not represented in the table structure
	const p = [];

	// user membership to groups vary based on ugCtx
	p.push(module.exports.membershipEdges.ensureIndex({ type: "persistent", fields: ["ugCtx", "appCtx"] }) // TODO: can we remove the appCtx here?
		.catch(ex => err(`ensureIndex('membershipEdges.ugCtx')`, ex)));
	// resource belongs to different resourceGroup vary based on rgCtx
	p.push(module.exports.resourceBelongsTo.ensureIndex({ type: "persistent", fields: ["rgCtx", "appCtx"] })
		.catch(ex => err(`ensureIndex('resourceBelongsTo.rgCtx')`, ex)));
	// permission differ based on permCtx
	p.push(module.exports.permissionEdges.ensureIndex({ type: "persistent", fields: ["permCtx", "appCtx"] })
		.catch(ex => err(`ensureIndex('permissionEdges.permCtx')`, ex)));
	
	// The available list of userGroups and resourceGroups vary based on appCtx
	p.push(module.exports.userOwnedUG.ensureIndex({ type: "persistent", fields: ["appCtx"] })
		.catch(ex => err(`ensureIndex('userOwnedUG.appCtx')`, ex)));
	p.push(module.exports.userOwnedRG.ensureIndex({ type: "persistent", fields: ["appCtx"] })
		.catch(ex => err(`ensureIndex('userOwnedRG.appCtx')`, ex)));
	p.push(module.exports.userDefaultRG.ensureIndex({ type: "persistent", fields: ["_from", "appCtx"], unique: true })
		.catch(ex => err(`ensureIndex('userDefaultRG.appCtx')`, ex)));
	p.push(module.exports.userDefaultRG.ensureIndex({ type: "persistent", fields: ["_to"], unique: true }) // no one else shares the same resource-group
		.catch(ex => err(`ensureIndex('userDefaultRG.appCtx')`, ex)));
	
	// make the combination unique
	p.push(module.exports.resourceBelongsTo.ensureIndex({ type: "persistent", fields: ["_from", "rgCtx"], unique: true })
		.catch(ex => err(`ensureIndex('resourceBelongsTo.unique')`, ex)));
	p.push(module.exports.rgMethodsColl.ensureIndex({ type: "persistent", fields: ["rg", "type", "method"], unique: true })
		.catch(ex => err(`ensureIndex('rgMethodsColl.unique')`, ex)));
	p.push(module.exports.permissionEdges.ensureIndex({ type: "persistent", fields: ["_from", "_to"], unique: true })
		.catch(ex => err(`ensureIndex('permissionEdges.unique')`, ex)));
	p.push(module.exports.iMethodsColl.ensureIndex({ type: "persistent", fields: ["interface", "name"], unique: true })
		.catch(ex => err(`ensureIndex('iMethodsColl.unique')`, ex)));
	p.push(module.exports.typedefInterfaces.ensureIndex({ type: "persistent", fields: ["_from", "_to"], unique: true })
		.catch(ex => err(`ensureIndex('typedefInterfaces.unique')`, ex)));
	
	return Promise.all(p);
}

function ensureBuiltinRecords() {
	const p = [];
	
	// create user groups
	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Everyone",
		name: "Everyone",
		description: "Everyone without any restriction. Includes logged-in, non-logged-in and every other user category without bounds."
	}).then(group => module.exports.builtIn.userGroups.Everyone = group[dbConfig.idField]));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-LoginUsers",
		name: "LoginUsers",
		description: "All users with a login account. Excludes any guest users that have no login account."
	}).then(group => module.exports.builtIn.userGroups.LoginUsers = group[dbConfig.idField]));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Guests",
		name: "Guests",
		description: "Users that have no login account"
	}));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Admin",
		name: "Admin",
		description: "Users that have Administrative Powers"
	}));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Inactive",
		name: "Inactive",
		description: "Users that are marked as inactive gets denied all permissions"
	}));
	
	// create resource groups
	p.push(ensureRecord(module.exports.resGroupColl, {
		[dbConfig.keyField]: "rg-Public",
		name: "Public",
		description: "A resource group that is accessible to Everyone"
	}).then(group => module.exports.builtIn.resourceGroups.Public = group[dbConfig.idField]));
	
	p.push(ensureRecord(module.exports.resGroupColl, {
		[dbConfig.keyField]: "rg-System",
		name: "System",
		description: "Built-in system resources. These are editable only by Admin users, and cannot be deleted."
	}).then(group => module.exports.builtIn.resourceGroups.System = group[dbConfig.idField]));

	p.push(registerInterfaces(module.exports, dbConfig));

	// TODO: ensure the built-in types (e.g. users etc.)
	// TODO: setup the interfaces for each built-in types

	// ensure the typeDef record
	// p.push(ensureRecord(module.exports.typeDefColl, {
	// 	[dbConfig.keyField]: "schepe",
	// 	name: "schepe",
	// 	schema: JSON.stringify(builtinTables["typeDefs"]),
	// 	private: false
	// }));

	return Promise.all(p);
}

module.exports = db;

module.exports.init = function () {
	
	const relationGraph = db.graph(RelationGraphName);
	const builtinTables = normalizeTables(require('./db_builtinTables'));

	return ensureTables(builtinTables)
		.then(() => ensureGraphExists(relationGraph))
		.then(() => ensureEdgeRelations(relationGraph, builtinTables))
		.then(() => {
			module.exports.userColl = db.collection("users");
			module.exports.typeDefColl = db.collection("typeDefs");
			module.exports.resourceColl = db.collection("resources");
			module.exports.resGroupColl = db.collection("resourceGroups");
			module.exports.rgMethodsColl = db.collection("resGroupMethods");
			module.exports.userGroupColl = db.collection("userGroups");
			module.exports.interfaceColl = db.collection("interfaces");
			module.exports.iMethodsColl = db.collection("interfaceMethods");

			module.exports.relationGraph = relationGraph;
			module.exports.userOwnedUG = relationGraph.edgeCollection("createdUG");
			module.exports.userOwnedRG = relationGraph.edgeCollection("createdRG");
			module.exports.userDefaultRG = relationGraph.edgeCollection("defaultRG");
			module.exports.membershipEdges = relationGraph.edgeCollection("memberOf"); // user memberOf userGroups
			module.exports.permissionEdges = relationGraph.edgeCollection("permissions");
			module.exports.resourceBelongsTo = relationGraph.edgeCollection("belongsTo"); // resource belongs to resourceGroup
			module.exports.typedefInterfaces = relationGraph.edgeCollection("supportedInterfaces");

			return ensureCustomIndices();
		}).then(ensureBuiltinRecords);
};

module.exports.ensureRecord = ensureRecord;

module.exports.builtIn = {
	userGroups: {},
	resourceGroups: {},
	interfaces: {}
};

module.exports.defaults = {
	appCtx: "defApp"
};

module.exports.idField = dbConfig.idField;
module.exports.keyField = dbConfig.keyField;
module.exports.rayField = dbConfig.rayField;