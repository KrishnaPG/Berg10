/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';

 // Prepare Sula
//import { registerFieldPlugins, registerRenderPlugins, registerActionPlugins, registerFilterPlugins, Icon } from 'sula';
import { AppstoreOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';

import 'jsoneditor-react/es/editor.min.css';
import { imported } from "react-imported-component/macro";

const JsonEditor = imported(() => Promise.all([
	import(/* webpackChunkName: "jsonEd" */ 'jsoneditor-react'),
	import(/* webpackChunkName: "jsonEd" */ 'brace'),
	import(/* webpackChunkName: "jsonEd" */ 'brace/mode/json'),
	import(/* webpackChunkName: "jsonEd" */ 'brace/theme/github')
]).then(([{ JsonEditor: Editor }, ace]) => {
	return function EditorHoc(props) {
		return (
			<Editor
				ace={ace}
				theme="ace/theme/github"
				{...props}
			/>
		);
	}
}), { async: true });

function CustomInput(props) {
	if (props.ctx) {
		const { config = {}, ctx } = props;
		return <Suspense fallback={<div className="LoadingMsg">Loading the Editor...</div>}>
			<JsonEditor
				htmlElementProps={{ className: "json-editor-container" }}
				name="Schepe"
				allowedModes={['tree', 'view', 'form', 'code', 'text']}
				mode='code'
				history={true}
				value={{obj1: 10}}
				onChange={this.handleChange}
			/>
		</Suspense>;
		//return <input {...config.props} style={{ display: ctx.visible ? '' : 'none' }} />;
	}

	return <input {...props} />;
}

const loadSula = () => import(/* webpackChunkName: "sula" */ "sula").then(sula => {
	console.log("initializing sula --------------------------: ", sula);
	// Register the plugins for Sula
	sula.registerFieldPlugins();
	sula.registerRenderPlugins();
	sula.registerActionPlugins();
	sula.registerFilterPlugins();

	// sula.fieldType('json', (ctx, config) => {
	// 	const {
	// 		mode,
	// 	} = ctx;
	// 	return <h2 disabled={mode === 'view'}>{{ ...config.props }}</h2>;
	// })	
	const comp = <h2>Json</h2>;
	sula.registerFieldPlugin('json')(CustomInput);

	// Register icons for Sula
	sula.Icon.iconRegister({
		user: UserOutlined,
		edit: {
			outlined: EditOutlined,
		},
		appStore: {
			outlined: AppstoreOutlined,
		},
	});
	return sula;
});
const sulaLoaded = new Promise((resolve, reject) => resolve(loadSula()));

export const CreateForm = React.lazy(() => sulaLoaded.then(() => import(/* webpackChunkName: "sula-create", webpackPrefetch: true */ 'sula/es/template-create-form/CreateForm')));
export const QueryTable = React.lazy(() => sulaLoaded.then(() => import(/* webpackChunkName: "sula-query", webpackPrefetch: true */ 'sula/es/template-query-table/QueryTable')));