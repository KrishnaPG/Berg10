/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Barrier from '../../RenderBarrier';
import { Button, PageHeader } from './antComponents';
import { PlusCircleOutlined } from './icons';
import { AxiosBaseComponent } from '../../../globals/axios';
import { getServerDBIdField } from '../../../globals/settings';
import { triggerPanelAdd, triggerNotifyError } from '../../../globals/triggers';
import { QueryTable } from './sula/';
import { AQLQueries as DataSource } from './dataSources';

import './typeRepo.scss';


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



class AQLQueries extends AxiosBaseComponent {

	constructor(props) {
		super(props);
		this.lastQueryTime = performance.now();
	}

	render() {
		return <PageHeader
			className="pageHeader"
			title="AQL Queries"
			subTitle=""
			extra={[
				<Button key="3" icon={<PlusCircleOutlined />} onClick={this.onAddNew} loading={this._pendingCalls["getTypeDef"]}>Add New Entry</Button>,
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
						columns={DataSource.queryView.columns}
						remoteDataSource={DataSource.queryView.remoteDataSource}
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
		console.log("AQLQueries content changed: ", ev);
	}

	// clicked add new button
	onAddNew = () => {
		this.getTypeDef('aqlQuery').then(typedef => {
			const schema = typedef.schema;
			triggerPanelAdd({
				bringToFocus: true,
				config: {
					typeSchema: schema
				},
				component: "AQLQueries.AddNew",
				icon: <PlusCircleOutlined className="mr-4" />,
				id: "New: AQLQuery",
				name: "New: AQLQuery"
			});
		});
	}	
};

export default AQLQueries;