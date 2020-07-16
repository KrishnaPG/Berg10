import React from 'react';

import "json-schema-editor-visual/dist/main.css";

import schemaEditor from "json-schema-editor-visual";
const SchemaEditor = schemaEditor({});

class TypeRepo extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		console.log("mounted repo");
	}
	componentWillUnmount() {
		console.log("unmounted repo");
	}

	render() {
		return <SchemaEditor/>;
	}
};

export default TypeRepo;