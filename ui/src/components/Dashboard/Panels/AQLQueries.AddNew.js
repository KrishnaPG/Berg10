/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula/';
import { getAxiosCommonHeaders } from '../../../globals/axios';
import { getSulaFormField, getFieldDefaultValues } from './sula/formFields';

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
				submit: {
					url: 'http://localhost:8080/api/typedef/new',
					method: 'POST',
					//headers: getAxiosCommonHeaders()
				},
				back: "resetFields",
				backButtonProps: {
					children: "Reset",
					title: "Reset all fields back to their default values"
				},
				actionsRender: [
					{
						type: 'button',
						props: {
							children: 'custom',
						},
						action: [
							() => {
								console.log('Back');
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
								url: 'http://localhost:8080/api/typedefs',
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