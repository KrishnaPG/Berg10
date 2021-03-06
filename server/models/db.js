/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Database, CollectionType } = require('arangojs');

const config = require('config');

const dbConfig = config.db;
const { normalizeTables, isGeoType, isRelationTable } = require('./db_schemaNormalization');

const { init: ensureInterfaceRecords } = require('../interfaces/');

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
	const coll = g.edgeCollection(edgeName).collection;
	return coll.exists().then(exists => {
		if (exists) return coll;
		return coll.create({ waitForSync: true, type: CollectionType.EDGE_COLLECTION })
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
	return g.exists().then(exists => exists ? g : g.create([]));
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
	p.push(module.exports.membershipEdges.collection.ensureIndex({ type: "persistent", fields: ["ugCtx"] })
		.catch(ex => err(`ensureIndex('membershipEdges.ugCtx')`, ex)));
	// resource belongs to different resourceGroup vary based on rgCtx
	p.push(module.exports.resourceBelongsTo.collection.ensureIndex({ type: "persistent", fields: ["rgCtx"] })
		.catch(ex => err(`ensureIndex('resourceBelongsTo.rgCtx')`, ex)));
	// permission differ based on permCtx
	p.push(module.exports.permissionEdges.collection.ensureIndex({ type: "persistent", fields: ["permCtx"] })
		.catch(ex => err(`ensureIndex('permissionEdges.permCtx')`, ex)));
	
	// The available list of userGroups and resourceGroups vary based on appCtx
	p.push(module.exports.userOwnedUG.collection.ensureIndex({ type: "persistent", fields: ["appCtx"] })
		.catch(ex => err(`ensureIndex('userOwnedUG.appCtx')`, ex)));
	p.push(module.exports.userOwnedRG.collection.ensureIndex({ type: "persistent", fields: ["appCtx"] })
		.catch(ex => err(`ensureIndex('userOwnedRG.appCtx')`, ex)));
	p.push(module.exports.userDefaultRG.collection.ensureIndex({ type: "persistent", fields: ["_from", "appCtx"], unique: true })
		.catch(ex => err(`ensureIndex('userDefaultRG.appCtx::_from')`, ex)));
	p.push(module.exports.userDefaultRG.collection.ensureIndex({ type: "persistent", fields: ["_to"], unique: true }) // no one else shares the same resource-group
		.catch(ex => err(`ensureIndex('userDefaultRG.appCtx::_to')`, ex)));
	
	// make the combination unique
	p.push(module.exports.membershipEdges.collection.ensureIndex({ type: "persistent", fields: ["_from", "ugCtx", "_to"], unique: true })
		.catch(ex => err(`ensureIndex('membershipEdges.unique')`, ex)));
	p.push(module.exports.resourceBelongsTo.collection.ensureIndex({ type: "persistent", fields: ["_from", "rgCtx"], unique: true })
		.catch(ex => err(`ensureIndex('resourceBelongsTo.unique')`, ex)));
	p.push(module.exports.rgMethodsColl.ensureIndex({ type: "persistent", fields: ["rg", "type", "method"], unique: true })
		.catch(ex => err(`ensureIndex('rgMethodsColl.unique')`, ex)));
	p.push(module.exports.permissionEdges.collection.ensureIndex({ type: "persistent", fields: ["_from", "_to"], unique: true })
		.catch(ex => err(`ensureIndex('permissionEdges.unique')`, ex)));
	p.push(module.exports.iMethodsColl.ensureIndex({ type: "persistent", fields: ["interface", "name"], unique: true })
		.catch(ex => err(`ensureIndex('iMethodsColl.unique')`, ex)));
	p.push(module.exports.typedefInterfaces.collection.ensureIndex({ type: "persistent", fields: ["_from", "_to"], unique: true })
		.catch(ex => err(`ensureIndex('typedefInterfaces.unique')`, ex)));
	
	return Promise.all(p);
}

function ensureBuiltinRecords(builtinTables) {
	const p = [];
	// create system user
	// p.push(ensureRecord(module.exports.userColl, {
	// 	[dbConfig.keyField]: "u-system",
	// 	name: "System",
	// 	description: "Built-in System User"
	// }).then(user => module.exports.builtIn.users.System = user[dbConfig.idField]));
	
	// create user groups
	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Everyone",
		name: "Everyone",
		description: "Everyone without any restriction. Includes logged-in, non-logged-in and every other user category without bounds."
	}).then(group => module.exports.builtIn.userGroups.Everyone = group[dbConfig.idField]));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-LoginUsers",
		name: "LoginUsers",
		description: "Users that belong to the built-in appCtx"
	}).then(group => module.exports.builtIn.userGroups.LoginUsers = group[dbConfig.idField]));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Guests",
		name: "Guests",
		description: "Users that have no login account"
	}));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Admin",
		name: "Admin",
		description: "Users that have Administrative Powers, System-wide"
	}).then(group => module.exports.builtIn.userGroups.Admin = group[dbConfig.idField]));

	p.push(ensureRecord(module.exports.userGroupColl, {
		[dbConfig.keyField]: "ug-Inactive",
		name: "Inactive",
		description: "Users that are marked as inactive gets denied all permissions, System-wide"
	}).then(group => module.exports.builtIn.userGroups.Inactive = group[dbConfig.idField]));
	
	// create resource groups
	p.push(ensureRecord(module.exports.resGroupColl, {
		[dbConfig.keyField]: "rg-Public",
		name: "Public",
		description: "A resource group that is accessible to Everyone"
	}).then(group => module.exports.builtIn.resourceGroups.Public = group[dbConfig.idField]));
	
	// TODO: setup the interfaces for each built-in types

	return Promise.all(p)
		.then(ensureBuiltinAppCtx)
		.then(() => ensureInterfaceRecords(module.exports, dbConfig))
		.then(() => ensureBuiltinTypeRecords(builtinTables));
}

function ensureBuiltinAppCtx() {
	return ensureRecord(module.exports.appCtxColl, {
		[dbConfig.keyField]: config.adminUI.appCtx,
		name: "BuiltIn AppCtx",
		description: "Built-in AppCtx",
		adminUG: module.exports.builtIn.userGroups.Admin,
		loginUG: module.exports.builtIn.userGroups.LoginUsers,
		inactiveUG: module.exports.builtIn.userGroups.Inactive,
		publicKey: null,
		allowedOrigins: config.adminUI.allowedOrigins,
	});
}

function ensureBuiltinTypeRecords(builtinTables) {
	const p = [];
	p.push(ensureRecord(module.exports.typeDefColl, {
		[dbConfig.keyField]: "schepe",
		name: "schepe",
		schema: builtinTables["typeDefs"]
	}));
	p.push(ensureRecord(module.exports.typeDefColl, {
		[dbConfig.keyField]: "aqlQuery",
		name: "aqlQuery",
		schema: builtinTables["aqlQuery"]
	}));
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
			module.exports.userColl = db.collection(module.exports.builtIn.collName.users);
			module.exports.appCtxColl = db.collection(module.exports.builtIn.collName.appCtx);
			module.exports.typeDefColl = db.collection(module.exports.builtIn.collName.typeDefs);
			module.exports.resourceColl = db.collection(module.exports.builtIn.collName.resources);
			module.exports.resGroupColl = db.collection(module.exports.builtIn.collName.resourceGroups);
			module.exports.rgMethodsColl = db.collection(module.exports.builtIn.collName.resGroupMethods);
			module.exports.userGroupColl = db.collection(module.exports.builtIn.collName.userGroups);
			module.exports.interfaceColl = db.collection(module.exports.builtIn.collName.interfaces);
			module.exports.iMethodsColl = db.collection(module.exports.builtIn.collName.interfaceMethods);

			module.exports.relationGraph = relationGraph;
			module.exports.userOwnedUG = relationGraph.edgeCollection(module.exports.builtIn.collName.createdUG);
			module.exports.userOwnedRG = relationGraph.edgeCollection(module.exports.builtIn.collName.createdRG);
			module.exports.userDefaultRG = relationGraph.edgeCollection(module.exports.builtIn.collName.defaultRG);
			module.exports.membershipEdges = relationGraph.edgeCollection(module.exports.builtIn.collName.memberOf); // user memberOf userGroups
			module.exports.permissionEdges = relationGraph.edgeCollection(module.exports.builtIn.collName.permissions);
			module.exports.resourceBelongsTo = relationGraph.edgeCollection(module.exports.builtIn.collName.belongsTo); // resource belongs to resourceGroup
			module.exports.typedefInterfaces = relationGraph.edgeCollection(module.exports.builtIn.collName.supportedInterfaces);

			return ensureCustomIndices();
		}).then(() => ensureBuiltinRecords(builtinTables));
};

module.exports.ensureRecord = ensureRecord;

module.exports.builtIn = {
	users: {},
	userGroups: {},
	resourceGroups: {},
	interfaces: {},
	collName: {
		appCtx: "appCtx",
		interfaces: "interfaces",
		interfaceMethods: "interfaceMethods",
		resources: "resources",
		resourceGroups: "resourceGroups",
		resGroupMethods: "resGroupMethods",
		typeDefs: "typeDefs",
		users: "users",
		userGroups: "userGroups",

		belongsTo: "belongsTo",
		createdUG: "createdUG",
		createdRG: "createdRG",
		defaultRG: "defaultRG",
		memberOf: "memberOf",
		permissions: "permissions",
		supportedInterfaces: "supportedInterfaces"
	}
};

module.exports.idField = dbConfig.idField;
module.exports.keyField = dbConfig.keyField;
module.exports.rayField = dbConfig.rayField;