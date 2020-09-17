/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const toJSONSchema = require('joi-to-swagger');

function ensureInterfaceMethod(db, dbConfig, interfaceRecord, methodName, methodDetails) {
	const iMethodName = `${interfaceRecord[dbConfig.keyField]}.${methodName}`;
	return db.ensureRecord(db.iMethodsColl, {
		[dbConfig.keyField]: iMethodName,
		interface: interfaceRecord[dbConfig.idField],
		name: methodName,
		inputSchema: toJSONSchema(methodDetails.inputSchema).swagger,
		outputSchema: toJSONSchema(methodDetails.outputSchema).swagger,
		description: methodDetails.description
	}).then(() => ({ [iMethodName]: methodDetails }));
}

function ensureInterface(db, dbConfig, {name, methods, description}) {
	return db.ensureRecord(db.interfaceColl, {
		[dbConfig.keyField]: name,
		name,
		description
	}).then(interfaceRecord =>
		Promise.all(Object.keys(methods).map(methodName =>
			ensureInterfaceMethod(db, dbConfig, interfaceRecord, methodName, methods[methodName])
		))
	).then(methodFnArray => Object.assign({}, ...methodFnArray));
}

module.exports.init = function(db, dbConfig) {
	const interfaces = [
		require('./iAppCtx'),
		require('./iTypedef'),
		require('./iTableEntry'),
		require('./iUsers'),
		require('./iUser'),
		require('./iUserGroup')
	];	
	return Promise.all(interfaces.map(interfaceObj => ensureInterface(db, dbConfig, interfaceObj)))
		.then(interfaceMethodsFnArray => Object.assign(module.exports.rpcMethods, ...interfaceMethodsFnArray));
}
	
module.exports.rpcMethods = {}; // init() should be called to populate these values