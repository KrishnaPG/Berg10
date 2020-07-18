import React, { Suspense } from 'react';
import { Button, PageHeader, Tabs } from 'antd';
import importedComponent from 'react-imported-component';

import 'jsoneditor-react/es/editor.min.css';
import './typeRepo.scss';

import { QueryTable } from 'sula';

// Prepare Sula
import { registerFieldPlugins, registerRenderPlugins, registerActionPlugins, registerFilterPlugins, Icon } from 'sula';
import { AppstoreOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
// Register the plugins for Sula
registerFieldPlugins();
registerRenderPlugins();
registerActionPlugins();
registerFilterPlugins();
// Register icons for Sula
Icon.iconRegister({
	user: UserOutlined,
	edit: {
		outlined: EditOutlined,
	},
	appStore: {
		outlined: AppstoreOutlined,
	},	
});


const { TabPane } = Tabs;
const PlusCircleOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/PlusCircleOutlined'));

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

const JsonEditor = importedComponent(() => Promise.all([
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'jsoneditor-react'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace/mode/json'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace/theme/github')
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
				<Button key="3" icon={<PlusCircleOutlined />}>Add New Entry</Button>,
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
			<QueryTable className="queryTable"
				layout="vertical"
				columns={columns}
				remoteDataSource={remoteDataSource}
				// fields={queryFields}
				rowKey="id"
				// actionsRender={actions}
				rowSelection={{}}
				tableProps={{ scroll: { y: 400 }, pagination: { position: ["topRight", "none"] }}}
			/>
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
};

export default TypeRepo;