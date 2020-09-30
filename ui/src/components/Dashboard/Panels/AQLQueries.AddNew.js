/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm, JsonFieldEditor } from './sula/';
import { getSulaFormField, getFieldDefaultValues } from './sula/formFields';
import { jsonRPCObj } from '../../../globals/utils';
import { Button, PageHeader } from './antComponents';

// const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/es/button/button'));
// const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/es/page-header/index'));


class AQLQueriesAddNew extends React.PureComponent {

	constructor(props) {
		super(props); 
		// convert typedef.schema to sula-form fields definition
		const schema = props.typeSchema;
		const fields = Object.entries(schema).map(getSulaFormField);
		const initialValues = getFieldDefaultValues(schema);
		this.state = {
			editConfig: {
				initialValues,
				fields,
				actionsRender: [
					{
						type: 'button',
						props: {
							children: 'Preview',
						},
						action: [
							'validateFields',
							{
								url: 'invoke',
								method: 'POST',
								params: ({ result }) => jsonRPCObj("iAQLQueries.exec", { ...result }),
								converter: axiosResponse => axiosResponse.data.result,
								//successMessage: 'Submitted successfully',
							},
							({result}) => {
								console.log("result: ", result);
							}
						],
					},
					{
						type: 'button',
						props: {
							type: 'primary',
							children: 'Submit',
						},
						action: [
							'validateFields',
							{
								url: 'typedefs',
								method: 'POST',
								params: ({ result }) => ({ ...result }),
								successMessage: 'Submitted successfully',
							},
							'resetFields',
						]
					}
				]
			},
			tabs: [{ title: '一', index: 0 }, { title: '二', index: 1 }, { title: '三', index: 2 }, { title: '四', index: 3 }, { title: '五', index: 4 }]
		};
	}

	componentDidMount() {
	}
	componentWillUnmount() {
	}

	render() {
		return <PageHeader
			className="pageHeader"
			title="AQL Query"
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

			<Suspense fallback={<div className="LoadingMsg">Loading the CreateForm...</div>}>
				<h3>Preview</h3>
			</Suspense>

		</PageHeader>
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}	

	onClick = ev => {
	}
}

export default AQLQueriesAddNew;