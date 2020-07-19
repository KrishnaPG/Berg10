/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

 // Prepare Sula
import { registerFieldPlugins, registerRenderPlugins, registerActionPlugins, registerFilterPlugins, Icon } from 'sula';
import { AppstoreOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';

// Register the plugins for Sula
registerFieldPlugins();
registerRenderPlugins();
registerActionPlugins();
registerFilterPlugins();

// Register icons for Sula
Icon.iconRegister({
	user: UserOutlined,
	edit: {
		outlined: EditOutlined,
	},
	appStore: {
		outlined: AppstoreOutlined,
	},
});

export const CreateForm = React.lazy(() => import(/* webpackChunkName: "sula-create", webpackPrefetch: true */ 'sula/es/template-create-form/CreateForm'));
export const QueryTable = React.lazy(() => import(/* webpackChunkName: "sula-query", webpackPrefetch: true */ 'sula/es/template-query-table/QueryTable'));