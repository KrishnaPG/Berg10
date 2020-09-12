/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Barrier from '../../RenderBarrier';
import { PlusCircleOutlined } from './icons';
import { AxiosBaseComponent } from '../../../globals/axios';
import { getServerDBIdField } from '../../../globals/settings';
import { triggerPanelAdd, triggerNotifyError } from '../../../globals/triggers';
import { QueryTable } from './sula';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));
const Switch = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPrefetch: true */ 'antd/lib/switch/index'));
const Tabs = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/tabs/index'));
const Tooltip = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPrefetch: true */ 'antd/lib/tooltip/index'));

const { TabPane } = Tabs;

const remoteDataSource = {
	url: 'http://localhost:8080/api/invoke',
	method: 'POST',
	convertParams({ params }) {
		console.log("params: ", params);
		return {
			jsonrpc: "2.0",
			method: "iUsers.find",
			params: {
				$limit: params.pageSize,
				$skip: (params.current - 1) * params.pageSize,
			//$sort: "",
			}
		};
	},
	converter({ data: jsonResponse }) {	/* data ==  bizDataAdapter(axiosResponse.data), which is the JSON rpc response */
		if (jsonResponse.jsonrpc != "2.0") throw new Error(`Invalid JSON response received: ${JSON.stringify(jsonResponse, null, 2)}`);
		const { limit, skip, total, data: list} = jsonResponse.result;
		return {
			list,
			total,
		};
	},
};
const columns = [
	{
		title: '_key',
		key: '_key',
	},
	{
		title: 'Name',
		key: 'name',
		sorter: true,
		filterRender: 'search'
	},
	{
		title: 'EMail',
		key: 'email',
		copyable: true,
		ellipsis: true,
		width: 200,
	},
	{
		title: 'Private',
		key: 'private',
		render: ctx => <Switch checked={ctx.record.private} checkedChildren="Yes" unCheckedChildren="No" disabled={true} size="small" />,
		sorter: true,
		filters: [
			{
				value: true,
				text: "Yes"
			},
			{
				value: false,
				text: "No"
			}
		]
	},
	{
		title: 'Operation',
		key: 'operation',
		render: [
			{
				type: 'icon',
				text: 'Preview',
				tooltip: 'Preview',
				visible: true,
				props: {
					type: 'preview',
				},
				action: [
					{
						type: 'drawerform',
						title: 'View',
						mode: 'view',
						remoteValues: {
							url: 'typedef',
							params: { id: '#{record._id}' },
							method: 'get',
						},
						//fields: fieldsConfig('view', this.format),
					},
				],
			},
			{
				type: 'icon',
				text: 'Quick Edit',
				tooltip: 'Quick Edit',
				visible: true,
				props: {
					type: 'edit',
				},
				action: [
					{
						type: 'drawerform',
						mode: 'edit',
						title: 'Edit',
						remoteValues: {
							url: 'typedef',
							params: { id: '#{record._id}' },
							method: 'get',
						},
						//fields: fieldsConfig('edit', this.format),
						submit: {
							url: '/api/release/edit.json',
							method: 'post',
							params: { id: '#{record.id}' },
							successMessage: 'edit.success',
							finish: {
								type: 'refreshtable',
							},
						},
					},
				],
			},
			{
				confirm: 'Delete？',
				type: 'icon',
				text: "Delete",
				tooltip: 'Delete',
				props: {
					type: "delete"
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

class Users extends AxiosBaseComponent {

	constructor(props) {
		super(props);
		this.lastQueryTime = performance.now();
	}

	render() {
		return <PageHeader
			className="pageHeader"
			title="Users"
			subTitle=""
			extra={[
				<Button key="3"
					onClick={this.onAddNew}
					loading={this._pendingCalls["getTypeDef"]}
					icon={<PlusCircleOutlined />}
				>Add New Entry
					</Button>,
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
				<Barrier lastModifiedAt={this.lastQueryTime}>
					<QueryTable className="queryTable"
						layout="vertical"
						columns={columns}
						remoteDataSource={remoteDataSource}
						// fields={queryFields}
						rowKey={getServerDBIdField()}
						// actionsRender={actions}
						rowSelection={{}}
						tableProps={{
							expandable: {
								expandedRowRender: record => <pre>{record.schema}</pre>,
								rowExpandable: () => true,
							},
							scroll: { y: 400 },
						}}
					/>
				</Barrier>
			</Suspense>
		</PageHeader>
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}

	// clicked add new button
	onAddNew = () => {
		//this.setState({ typedefQueryInProgress: true });
		this.getTypeDef().then(typedef => {
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
				throw (ex);
			}
		}).catch(error => { if (!this.isCancel(error)) triggerNotifyError(error); });
	}
};

export default Users;