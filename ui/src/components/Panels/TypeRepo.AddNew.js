/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Axios from 'axios'; 
import { Button, PageHeader, Tabs } from 'antd';
//import importedComponent from 'react-imported-component';



import { CreateForm } from './sula';

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
		return Axios.get(`http://localhost:8080/api/typedef?name="something"`, { headers: { Authorization: "Bearer " + jwt } })
			.then(response => {
				console.log("response: ", response);
			})
			.catch(ex => {				
				if (ex.response && ex.response.data.error)
					ex.message = ex.response.data.error.message;	// show any payload the server might have returned
				console.log("exception: ", ex);
			});		
	}
}

export default TypeRepoAddNew;