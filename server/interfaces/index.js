/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const interfaces = [
	require('./typedef'),
	require('./tableEntry')
];

function ensureInterfaceMethod(db, dbConfig, interfaceRecord, methodName, methodDetails) {
	const iMethodName = `${interfaceRecord[dbConfig.keyField]}.${methodName}`;
	return db.ensureRecord(db.iMethodsColl, {
		[dbConfig.keyField]: iMethodName,
		interface: interfaceRecord[dbConfig.idField],
		name: methodName,
		inputSchema: methodDetails.inputSchema,
		outputSchema: methodDetails.outputSchema,
		description: methodDetails.description
	}).then(() => ({ [iMethodName]: methodDetails.fn }));
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

module.exports = (db, dbConfig) =>
	Promise.all(interfaces.map(interface => ensureInterface(db, dbConfig, interface)))
		.then(interfaceMethodsFnArray => Object.assign(module.exports.rpcMethods, ...interfaceMethodsFnArray));
	
module.exports.rpcMethods = {};
