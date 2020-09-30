/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Barrier from '../../RenderBarrier';
import { PlusCircleOutlined } from './icons';
import { AxiosBaseComponent } from '../../../globals/axios';
import { getServerDBIdField } from '../../../globals/settings';
import { jsonRPCObj } from '../../../globals/utils';
import { triggerPanelAdd, triggerNotifyError } from '../../../globals/triggers';
import { QueryTable } from './sula';
import { Button, PageHeader, Switch } from './antComponents';

const fieldsConfig = [
	{
		"name": "sender",
		"container": {
			"type": "card",
			"props": {
				"title": "发送",
				"type": "inner",
				"bordered": true,
				"style": {
					"padding": 0,
					"marginBottom": 16
				},
				"bodyStyle": {
					"marginTop": 24
				}
			}
		},
		"fields": [
			{
				"name": "senderName",
				"label": "发送人姓名",
				"field": {
					"type": "input",
					"props": {
						"placeholder": "请输入发送人姓名"
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			},
			{
				"name": "secrecy",
				"label": "是否保密",
				"field": {
					"type": "switch",
					"props": {
						"checkedChildren": "on",
						"unCheckedChildren": "off"
					}
				},
				"valuePropName": "checked"
			},
			{
				"name": "senderNumber",
				"label": "发送人号码",
				"field": {
					"type": "inputnumber",
					"props": {
						"placeholder": "请输入发送人号码",
						"style": {
							"width": "80%"
						}
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			},
			{
				"name": "senderAddress",
				"label": "发送人地址",
				"field": {
					"type": "textarea",
					"props": {
						"placeholder": "发送人地址"
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			}
		]
	},
	{
		"name": "recipient",
		"container": {
			"type": "card",
			"props": {
				"title": "接收",
				"type": "inner",
				"bordered": true,
				"style": {
					"padding": 0,
					"marginBottom": 16
				},
				"bodyStyle": {
					"marginTop": 24
				}
			}
		},
		"fields": [
			{
				"name": "recipientName",
				"label": "接收人姓名",
				"field": {
					"type": "select",
					"props": {
						"placeholder": "请选择接收人姓名"
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			},
			{
				"name": "recipientTime",
				"label": "接收时间",
				"field": {
					"type": "checkboxgroup"
				},
				"initialSource": [
					{
						"text": "Morning",
						"value": "morning"
					},
					{
						"text": "Afternoon",
						"value": "afternoon"
					},
					{
						"text": "Night",
						"value": "night"
					}
				]
			},
			{
				"name": "recipientNumber",
				"label": "接收人号码",
				"field": {
					"type": "inputnumber",
					"props": {
						"placeholder": "请输入接收人号码",
						"style": {
							"width": "80%"
						}
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			},
			{
				"name": "recipientAddress",
				"label": "接收人地址",
				"field": {
					"type": "textarea",
					"props": {
						"placeholder": "请输入接收人地址"
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			}
		]
	},
	{
		"name": "basic",
		"container": {
			"type": "card",
			"props": {
				"title": "基础",
				"type": "inner",
				"bordered": true,
				"style": {
					"padding": 0,
					"marginBottom": 16
				},
				"bodyStyle": {
					"marginTop": 24
				}
			}
		},
		"fields": [
			{
				"name": "time",
				"label": "送货时间",
				"field": {
					"type": "rangepicker",
					"props": {
						"placeholder": [
							"开始时间",
							"结束时间"
						]
					}
				},
				"rules": [
					{
						"required": true,
						"message": "该项为必填项"
					}
				]
			},
			{
				"name": "priceProject",
				"label": "价格保护",
				"field": {
					"type": "slider",
					"props": {
						"min": 0,
						"max": 1000,
						"step": 100,
						"dots": true
					}
				}
			},
			{
				"name": "description",
				"label": "其他信息",
				"field": {
					"type": "textarea",
					"props": {
						"placeholder": "请输入其他信息"
					}
				}
			}
		]
	}
];

const remoteDataSource = {
	url: 'invoke',
	method: 'POST',
	convertParams({ params }) {
		return jsonRPCObj("iUsers.find", {
			limit: params.pageSize,
			skip: (params.current - 1) * params.pageSize,
			//sort: "",
		});
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
							url: 'invoke',
							params: jsonRPCObj("iUser.getFullDetails", { userId: `#{record['${getServerDBIdField()}']}`}),
							method: 'post',
						},
						fields: fieldsConfig
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