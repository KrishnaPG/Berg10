/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula';
import { getTypeDef } from '../../../globals/axios';

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
		this.state = {}; console.log("typereportadd new: ", props);
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
				<CreateForm {...config} />
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
		getTypeDef()
	}
}

export default TypeRepoAddNew;