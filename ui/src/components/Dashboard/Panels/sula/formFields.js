/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const validationSupportedTypes = { "string": "string", "boolean": "boolean", "text": "string" };
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
	const type = validationSupportedTypes[fldDefn.type];
	if (!type) return rules;
	rules.push({ type, required: fldDefn.nullable === false ? true : false });
	if (fldDefn.min) rules.push({ type, min: fldDefn.min });
	if (fldDefn.max) rules.push({ type, max: fldDefn.max });
	if (type === "string") rules.push({ type, whitespace: true });
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