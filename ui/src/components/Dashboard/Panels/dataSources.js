/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { Switch } from './antComponents';

function remoteDataSource(url, method = 'GET') {
	return {
		url,
		method: 'GET',
		convertParams({ params }) {
			console.log("params: ", params);
			return {
				$limit: params.pageSize,
				$skip: (params.current - 1) * params.pageSize,
				//$sort: "",
			};
		},
		converter(axiosResponse) {
			return {
				list: axiosResponse.data.result,
				total: 100,
			};
		},
	};
}

export const AQLQueries = {
	queryView: {
		remoteDataSource: 	remoteDataSource('http://localhost:8080/api/typedef'),
		columns: [
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
				title: 'Schema',
				key: 'schema',
				copyable: true,
				ellipsis: true,
				width: 200,
			},
			{
				title: 'Private',
				key: 'private',
				render: ctx => <Switch checked={ctx.record.private} checkedChildren="Yes" unCheckedChildren="No" disabled={true} size="small"/>,
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
		]			
	}
};