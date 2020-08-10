/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula/';
import { getAxiosCommonHeaders } from '../../../globals/axios';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));

const validationSupportedTypes = { "string": true, "boolean": true };
const controlMap = {
	"string": { field: "input" },
	"boolean": {
		field: "switch",
		valuePropName: "checked"
	},
	"json": { field: "json" },
};
function getRules(fldDefn) {
	const rules = [];
	if (validationSupportedTypes[fldDefn.type]) {
		rules.push({ type: fldDefn.type, required: fldDefn.nullable ? false : true});
		if (fldDefn.min) rules.push({ type: fldDefn.type, min: fldDefn.min });
		if (fldDefn.max) rules.push({ type: fldDefn.type, max: fldDefn.max });
		if (fldDefn.type === "string") rules.push({ type: fldDefn.type, whitespace: true });		
	}
	return rules;
}
function getSulaFormField([fldName, fldDefn]) {	
	const rules = getRules(fldDefn);
	return { name: fldName, label: fldName, rules, ...controlMap[fldDefn.type] };
	// Ref: https://ant.design/components/form/#Rule
}

const defaultValues = {
	"string": "",
	"boolean": false,
	"json": {}
};
function getFieldDefaultValues(typeSchema) {
	const retVal = {};
	for (let [fld, fldDefn] of Object.entries(typeSchema)) {
		retVal[fld] = fldDefn.default || defaultValues[fldDefn.type]
	}
	return retVal;
}

class TypeRepoAddNew extends React.PureComponent {

	constructor(props) {
		super(props); 
		// convert typedef.schema to sula-form fields definition
		const schema = props.typeSchema;
		const fields = Object.entries(schema).map(getSulaFormField);
		const initialValues = getFieldDefaultValues(schema);
		this.state = {
			editConfig: {
				initialValues,
				fields,
				submit: {
					url: 'http://localhost:8080/api/typedef/new',
					method: 'POST',
					//headers: getAxiosCommonHeaders()
				},
				back: "resetFields",
				backButtonProps: {
					children: "Reset",
					title: "Reset all fields back to their default values"
				}
			}
		};
	}

	componentDidMount() {
	}
	componentWillUnmount() {
	}

	render() {
		return <PageHeader
			className="pageHeader"
			title="Type Repository"
			subTitle=""
			extra={[
				<Button key="2" onClick={this.onClick}>Operation</Button>,
				<Button key="1" type="primary">
					Primary
				</Button>,
			]}
		>
			<Suspense fallback={<div className="LoadingMsg">Loading the CreateForm...</div>}>
				<CreateForm {...this.state.editConfig} />
			</Suspense>
		</PageHeader>
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}	

	onClick = ev => {
	}
}

export default TypeRepoAddNew;