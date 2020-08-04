/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';

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

class JsonFieldEditor extends React.Component {
	constructor(props) {
		super(props);
		console.log("TestComp props:", props);
		this.state = {};
	}
	componentDidMount() { console.log("TestComp::Mount") }
	componentWillUnmount() { console.log("TestComp::Unmount") }
	render() {
		return <Suspense fallback={<div className="LoadingMsg">Loading the Editor...</div>}>
			<JsonEditor
				htmlElementProps={{ className: "json-editor-container" }}
				name="Schepe"
				allowedModes={['tree', 'view', 'form', 'code', 'text']}
				mode='code'
				history={true}
				value={this.props.value || { obj: 10 }}
				onChange={this.props.onChange}
			/>
		</Suspense>;
	}
}

export default JsonFieldEditor;