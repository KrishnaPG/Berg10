/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { PlusCircleOutlined } from './icons';
import { triggerPanelAdd, triggerNotifyError } from '../../../globals/triggers';
import { getTypeDef } from '../../../globals/axios';
import { QueryTable } from './sula/';

import './typeRepo.scss';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));
const Tabs = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/tabs/index'));

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
		this.state = {
			typedefQueryInProgress: false
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
				<Button key="3" icon={<PlusCircleOutlined />} onClick={this.onAddNew} loading={this.state.typedefQueryInProgress}>Add New Entry</Button>,
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
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}

	// clicked add new button
	onAddNew = () => {
		this.setState({ typedefQueryInProgress: true });
		getTypeDef().then(typedef => {
			try {
				const schema = JSON.parse(typedef.schema);
				triggerPanelAdd({
					bringToFocus: true,
					config: {
						typeSchema: schema
					},
					component: "TypeRepo.AddNew",
					icon: <PlusCircleOutlined className="mr-4" />,
					id: "New: Type",
					name: "New: Type"
				});
			} catch (ex) {
				ex.title = "Invalid Type Definition";
				Promise.reject(ex);
			}
		}).catch(triggerNotifyError).finally(() => {
			this.setState({ typedefQueryInProgress: false });
		});
	}	
};

export default TypeRepo;