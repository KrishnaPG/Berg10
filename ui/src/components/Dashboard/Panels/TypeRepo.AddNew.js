/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula';
import { getTypeDef } from '../../../globals/axios';
import { safeParse } from '../../../globals/utils';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));


const config = {
	fields: [
		{
			name: 'name',
			label: 'Name',
			field: 'input',
		},
		{
			name: "json",
			field: "json"
		}
	],
	submit: {
		url: 'https : //www.mocky.io/v2/5ed7a8b63200001ad9274ab5',
		method: 'POST',
	}
};





class TypeRepoAddNew extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			editConfig: {
				fields: [],
				submit: {
					url: 'https : //www.mocky.io/v2/5ed7a8b63200001ad9274ab5',
					method: 'POST',
				}
			}
		};
	}

	componentDidMount() {
		console.log("mounted repo");
	}
	componentWillUnmount() {
		console.log("unmounted repo");
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

			{/* <Suspense fallback={<div className="LoadingMsg">Loading the Editor...</div>}>
				<JsonEditor
					htmlElementProps={{ className: "json-editor-container" }}
					name="Schepe"
					allowedModes={['tree', 'view', 'form', 'code', 'text']}
					mode='code'
					history={true}
					value={{}}
					onChange={this.handleChange}
				/>
			</Suspense> */}
		</PageHeader>
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}	

	onClick = ev => {
		const controlMap = {
			"string": { field: "input" },
			"json": { field: "json" },
			"boolean": {
				field: "switch",
				valuePropName: "checked"
			}
		};
		getTypeDef().then(typedef => {
			// convert typedef.schema to fields definition
			const schema = safeParse(typedef.schema);
			const fields = Object.keys(schema).map(key => ({ name: key, label: key, ...controlMap[schema[key].type] }));
			console.log("typedef: ", typedef, " fields: ", fields, " fields: ", JSON.stringify(fields));
			this.setState({
				editConfig: {
					fields,
					submit: {
						url: 'https : //www.mocky.io/v2/5ed7a8b63200001ad9274ab5',
						method: 'POST',
					}
				}
			})
		});
	}
}

export default TypeRepoAddNew;