/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import JsonFieldEditor from './jsonEd';

import { AppstoreOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';


const loadSula = () => import(/* webpackChunkName: "sula" */ "sula").then(sula => {	
	// Register the plugins for Sula
	sula.registerFieldPlugins();
	sula.registerRenderPlugins();
	sula.registerActionPlugins();
	sula.registerFilterPlugins();

	sula.registerFieldPlugin('json')(JsonFieldEditor);

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