/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';

import 'jsoneditor-react/es/editor.min.css';
import { imported } from "react-imported-component/macro";
const Skeleton = React.lazy(() => import(/* webpackChunkName: "antSkeleton", webpackPreload: true */ 'antd/es/skeleton/Skeleton'));

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

class JsonFieldEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	render() {
		return <Suspense fallback={<Skeleton active />}>
			<JsonEditor
				htmlElementProps={{ className: "json-editor-container" }}
				name="Schepe"
				allowedModes={['tree', 'view', 'form', 'code', 'text']}
				mode='code'
				history={true}
				value={this.props.value || { key: "value" }}
				onChange={this.props.onChange}
			/>
		</Suspense>;
	}
}

export default JsonFieldEditor;