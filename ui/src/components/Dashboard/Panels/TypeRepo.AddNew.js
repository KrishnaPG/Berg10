/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula/';
import { getTypeDef } from '../../../globals/axios';
import { safeParse } from '../../../globals/utils';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));

const controlMap = {
	"string": { field: "input" },
	"json": { field: "json" },
	"boolean": {
		field: "switch",
		valuePropName: "checked"
	}
};

class TypeRepoAddNew extends React.Component {

	constructor(props) {
		super(props); 
		// convert typedef.schema to sula-form fields definition
		const schema = props.typeSchema;
		const fields = Object.keys(schema).map(key => ({ name: key, label: key, ...controlMap[schema[key].type] }));
		this.state = {
			editConfig: {
				fields,
				submit: {
					url: 'https : //www.mocky.io/v2/5ed7a8b63200001ad9274ab5',
					method: 'POST',
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