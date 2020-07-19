/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { Button, PageHeader, Tabs } from 'antd';
import { PlusCircleOutlined } from './icons';
import { triggerPanelAdd } from '../globals';
import { QueryTable } from './sula';

import './typeRepo.scss';

const { TabPane } = Tabs;

const remoteDataSource = {
	url: 'https://randomuser.me/api',
	method: 'GET',
	convertParams({ params }) {
		return {
			results: params.pageSize,
			...params,
		};
	},
	converter({ data }) {
		return {
			list: data.results.map((item, index) => {
				return {
					...item,
					id: `${index}`,
					name: `${item.name.first} ${item.name.last}`,
					index,
				};
			}),
			total: 100,
		};
	},
};
const columns = [
	{
		title: 'Index',
		key: 'index',
	},
	{
		title: 'Nat',
		key: 'nat',
	},
	{
		title: 'Name',
		key: 'name',
		copyable: true,
		ellipsis: true,
		width: 200,
	},
	{
		title: 'Age',
		key: 'age',
		render: (ctx) => {
			return <span>{ctx.record.registered.age}</span>;
		},
	},
	{
		title: 'Operation',
		key: 'operation',
		render: [
			{
				confirm: 'Delete？',
				type: 'icon',
				props: {
					type: "appStore"
				},
				action: [
					{
						type: 'request',
						url: 'https://www.mocky.io/v2/5185415ba171ea3a00704eed',
						method: 'POST',
						params: {
							id: '#{record.id}',
						},
						successMessage: 'Success',
					},
					'refreshTable',
				],
			},
		],
	},
];

const actions = [
	{
		type: 'button',
		props: {
			type: 'primary',
			children: 'Bulk Registration',
		},
		action: [
			{
				type: 'modalform',
				title: 'Information',
				fields: [
					{
						name: 'name',
						label: 'Name',
						field: 'input',
					},
				],
				submit: {
					url: 'https://www.mocky.io/v2/5185415ba171ea3a00704eed',
					method: 'POST',
				},
			},
			'refreshTable',
		],
	},
];



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
		return <PageHeader
			className="pageHeader"
			title="Type Repository"
			subTitle=""
			extra={[
				<Button key="3" icon={<PlusCircleOutlined />} onClick={this.onAddNew} >Add New Entry</Button>,
				<Button key="2">Operation</Button>,
				<Button key="1" type="primary">
					Primary
				</Button>,
			]}
			// footer={
			// 	<Tabs defaultActiveKey="1">
			// 		<TabPane tab="Details" key="1"><h2>Hello Details</h2></TabPane>
			// 		<TabPane tab="Rule" key="2"><h2>Rule</h2></TabPane>
			// 	</Tabs>
			// }
		>
			<Suspense fallback={<div className="LoadingMsg">Loading the QueryTable...</div>}>
				<QueryTable className="queryTable"
					layout="vertical"
					columns={columns}
					remoteDataSource={remoteDataSource}
					// fields={queryFields}
					rowKey="id"
					// actionsRender={actions}
					rowSelection={{}}
					tableProps={{ scroll: { y: 400 } }}
				/>
			</Suspense>
		</PageHeader>

		// return <Suspense fallback={<div className="LoadingMsg">Loading the Editor...</div>}>
		// 	<JsonEditor
		// 		htmlElementProps={{class: "json-editor-container"}}
		// 		name="Schepe"
		// 		allowedModes={['tree', 'view', 'form', 'code', 'text']}
		// 		mode='code'
		// 		history={true}
		// 		value={{}}
		// 		onChange={this.handleChange}
		// 	/>
		// </Suspense>;
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}

	// clicked add new button
	onAddNew = () => {
		triggerPanelAdd({ component: "TypeRepo.AddNew", name: "New: Type", icon: <PlusCircleOutlined className="mr-4" />, config: { text: "i was added" } });
	}	
};

export default TypeRepo;