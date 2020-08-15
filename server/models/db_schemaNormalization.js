const ObjectPath = require('object-path');
const { DepGraph } = require('dependency-graph');
const { builtIns, $extends } = require('./db_schemaUtils');

const builtInFieldTypes = {
	"boolean": true,
	"dateTime": true,
	"enum": true,
	"float": true,
	"geoPoint": true,
	"geoJSON": true,	
	"integer": true,
	"json": true,
	"jsonb": true,
	"string": true,
	"text": true,	// multiline Text
	"uuid": true
};
const extendedFieldTypes = {
	"code": { type: "text", format: "code", nullable: true },
	"email": { type: "string", format: "email", unique: true, nullable: false, index: true, max: 32 },
	"html": { type: "text", format: "html", nullable: true },
	"richText": { type: "text", format: "rtf", nullable: true },
	"url": { type: "string", format: "url", nullable: true, index: true, max: 128 }
};
const supportedFieldTypes = Object.assign({}, builtInFieldTypes, extendedFieldTypes);

const ThreeDigitRandomId = () => (100 + Math.floor(Math.random() * 899));
const RelationTableNameRegEx = /^\$rel_(?<relName>(?<tbl>[\w]+)_(?<fld>[\w]+))_\d{0,3}$/;

function isObjectNotEmpty(obj) {
	for (let key in obj)
		if (obj.hasOwnProperty(key))
			return true;
	return false; // object is empty
}

function addNewTable(newTableName, tbl, fld, fldDefn, pendingTables) {
	if (!pendingTables[newTableName])
		pendingTables[newTableName] = {};
	pendingTables[newTableName][tbl] = { type: "fk", foreignKey: `${tbl}` };
	pendingTables[newTableName][fld] = fldDefn[0];
}

function addNewRelation(tbl, fld, fldDefn, pendingRelations) {
	if (!pendingRelations[tbl]) pendingRelations[tbl] = {};
	pendingRelations[tbl][fld] = fldDefn;
}

function expandNestedChild(tbl, fld, fldDefn, pendingFields, typed = false) {
	for (let [childFld, childFldDefn] of Object.entries(typed ? fldDefn.properties : fldDefn)) {
		if (childFld.indexOf('.') >= 0)
			throw new Error(`Nested fields should not contain . in their name. Invalid field "${childFld}" of "${fld}" for "${tbl}"`);
		pendingFields[`${fld}.${childFld}`] = childFldDefn;
	}
}

function expandTypedChild(tbl, fld, fldDefn, pendingFields) {
	expandNestedChild(tbl, fld, fldDefn, pendingFields, true);
}

function expandUnTypedChild(tbl, fld, fldDefn, pendingFields) {
	expandNestedChild(tbl, fld, fldDefn, pendingFields, false);
}

function normalizeFieldDefn(tbl, fld, fldDefn, pendingTables, isArrayAllowed = true) {
	// normalize the structure
	if (Array.isArray(fldDefn)) {
		if (!isArrayAllowed)
			throw new Error(`${tbl}.${fld} invalid array found ${JSON.stringify(fldDefn, null, "  ")}`);
		if (!fldDefn.length)
			throw new Error(`${tbl}.${fld} should not be an empty array`);
		if (fldDefn.length === 1) {
			const newTableName = `$rel_${tbl}_${fld}_`;
			// an array of some type - needs a new table
			addNewTable(newTableName, tbl, fld, fldDefn, pendingTables);
			// add the field to the tbl and mark it as array
			if (!pendingTables[tbl])
				pendingTables[tbl] = {};
			pendingTables[tbl][fld] = $extends(normalizeFieldDefn(tbl, fld, fldDefn[0], pendingTables, false), { isArray: true, relationTable: newTableName });
			return null;
		} else if (fldDefn.length > 1) {
			// must be enum values
			return { type: "enum", values: fldDefn };
		}
	} else {
		switch (typeof fldDefn) {
			case "function": {
				return fldDefn(fld, tbl);
			}
			case "string": {
				if (!supportedFieldTypes[fldDefn]) {
					return { type: "fk", foreignKey: fldDefn };
				}
				if (extendedFieldTypes[fldDefn]) // if extended type, use its definition
					return extendedFieldTypes[fldDefn];
				else
					return { type: fldDefn }; // else, it could be a simple type
				break;
			}
			case "object":
			default: {
				return fldDefn; break;
			}
		}
	}
}

function normalizeTable(tbl, tblDefn, normTables) {
	const pendingFields = {};
	const pendingTables = {};
	const pendingRelations = {};
	const normFields = normTables[tbl];

	for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		// normalize the structure
		const normFldDefn = normalizeFieldDefn(tbl, fld, fldDefn, pendingTables);
		if (!normFldDefn) continue;

		// postpone processing foreign-key relation till all tables are done
		if (normFldDefn.type === "fk") {
			addNewRelation(tbl, fld, normFldDefn, pendingRelations);
			continue;
		}
		else if (normFldDefn.type === "object") {
			expandTypedChild(tbl, fld, normFldDefn, pendingFields);
			continue;
		}
		else if (isObjectNotEmpty(normFldDefn) && !normFldDefn.type) {
			expandUnTypedChild(tbl, fld, normFldDefn, pendingFields);
			continue;
		}

		// sanity checks for the normFldDefn
		if (!supportedFieldTypes[normFldDefn.type])
			throw new Error(`${tbl}.${fld} has unknown type: ${normFldDefn.type}`);
		// check if field name already exists (happens nested types expand to same name)
		if (normFields[fld])
			throw new Error(`${tbl} encountered duplicate field with same name "${fld}"`);
		// sanitize the nested field names
		if (fld.indexOf('.') >= 0) {
			normFldDefn.pathInInput = fld;
			fld = fld.replace(/\./g, '_');
		}

		normFields[fld] = normFldDefn;
	}
	return {
		pendingFields,
		pendingTables,
		pendingRelations
	}
}

function normalizePendingTables(tables) {
	const normTables = {};
	let pendingTables = {};
	let pendingRelations = {};

	for (let [tbl, tblDefn] of Object.entries(tables)) {
		normTables[tbl] = {};
		let pendingFields = tblDefn;
		while (isObjectNotEmpty(pendingFields)) {
			const result = normalizeTable(tbl, pendingFields, normTables);
			pendingTables = $extends(pendingTables, result.pendingTables);
			pendingRelations = $extends(pendingRelations, result.pendingRelations);
			pendingFields = result.pendingFields;
		}
	}

	return {
		normTables,
		pendingTables,
		pendingRelations
	};
}

function normalizePendingRelations(pendingRelations, normTables) {
	const g = new DepGraph();
	Object.keys(normTables).forEach(tbl => g.addNode(tbl));

	for (let [tbl, tblDefn] of Object.entries(pendingRelations)) {
		for (let [fld, fldDefn] of Object.entries(tblDefn)) {
			// add default id if no col is specified for the foreign key table
			if (fldDefn.foreignKey.lastIndexOf('.') == -1)
				fldDefn.foreignKey += ".id";
			
			const foreignKeyTable = fldDefn.foreignKey.split('.')[0];			
			
				// get the type definition of the referred foreign key
			const referredTypeDefn = normTables[foreignKeyTable];
			if (!referredTypeDefn)
				throw new Error(`${tbl}.${fld} Invalid foreign key reference: ${fldDefn.foreignKey}`);
			if (referredTypeDefn.foreignKey)
				throw new Error(`${tbl}.${fld} is a foreign key pointing to another foreign key: ${referredTypeDefn.foreignKey}`);
			
			const fldType = { type: foreignKeyTable, foreignKey: fldDefn.foreignKey.replace(foreignKeyTable, ''), index: true };
			
			// set type of array meta fields to be the referred table
			if (fldDefn.isArray && fldDefn.relationTable) {
				fldType.isArray = true;
				fldType.relationTable = fldDefn.relationTable;
			}
			
			normTables[tbl][fld] = fldType;
			// add dependency
			g.addDependency(tbl, foreignKeyTable);
		}
	}
	// sort based on dependencies
	return g.overallOrder().reduce((obj, tbl) => { obj[tbl] = normTables[tbl]; return obj; }, {});
}

function normalizeTables(tables) {
	let normTables = {};
	let pendingTables = tables;
	let pendingRelations = {};

	while (isObjectNotEmpty(pendingTables)) {
		const result = normalizePendingTables(pendingTables);
		pendingTables = result.pendingTables;
		pendingRelations = $extends(pendingRelations, result.pendingRelations);
		normTables = $extends(normTables, result.normTables);
	}
	return normalizePendingRelations(pendingRelations, normTables);
}

module.exports = {
	normalizeTables,
	isRelationTable: (name) => RelationTableNameRegEx.exec(name),
	isGeoType: type => (type == "geoPoint" || type == "geoJSON"),

	builtInFieldTypes,
	extendedFieldTypes,
	supportedFieldTypes	
};