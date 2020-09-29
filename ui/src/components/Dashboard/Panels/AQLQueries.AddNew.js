/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula/';
import { getSulaFormField, getFieldDefaultValues } from './sula/formFields';
import { jsonRPCObj } from '../../../globals/utils';

const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));


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
								params: ({ result }) => {
									return jsonRPCObj("iAQLQueries.exec", { ...result })
								},
								successMessage: 'Submitted successfully',
							},
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
			}
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
		</PageHeader>
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}	

	onClick = ev => {
	}
}

export default AQLQueriesAddNew;