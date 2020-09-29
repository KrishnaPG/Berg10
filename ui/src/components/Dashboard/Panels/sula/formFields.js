/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const validationSupportedTypes = { "string": true, "boolean": true };
const controlMap = {
	"string": { field: "input" },
	"text": { field: "textarea" },
	"boolean": {
		field: "switch",
		valuePropName: "checked"
	},
	"json": { field: "json" },
};
function getRules(fldDefn) {
	const rules = [];
	if (validationSupportedTypes[fldDefn.type]) {
		rules.push({ type: fldDefn.type, required: fldDefn.nullable ? false : true });
		if (fldDefn.min) rules.push({ type: fldDefn.type, min: fldDefn.min });
		if (fldDefn.max) rules.push({ type: fldDefn.type, max: fldDefn.max });
		if (fldDefn.type === "string") rules.push({ type: fldDefn.type, whitespace: true });
	}
	return rules;
}
export function getSulaFormField([fldName, fldDefn]) {
	const rules = getRules(fldDefn);
	return { name: fldName, label: fldName, rules, ...controlMap[fldDefn.type] };
	// Ref: https://ant.design/components/form/#Rule
}

const defaultValues = {
	"string": "",
	"text": "",
	"boolean": false,
	"json": {}
};
export function getFieldDefaultValues(typeSchema) {
	const retVal = {};
	for (let [fld, fldDefn] of Object.entries(typeSchema)) {
		retVal[fld] = fldDefn.default || defaultValues[fldDefn.type]
	}
	return retVal;
}