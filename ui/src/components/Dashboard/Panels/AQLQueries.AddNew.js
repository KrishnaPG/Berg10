/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from './sula/';
import { getSulaFormField, getFieldDefaultValues } from './sula/formFields';
import { jsonRPCObj } from '../../../globals/utils';
import { Button, Collapse, CollapsePanel, PageHeader } from './antComponents';

import { PeculiarFortifyCertificates } from '@peculiar/fortify-webcomponents-react';
import "@peculiar/fortify-webcomponents/dist/peculiar/peculiar.css";

import 'react-perfect-scrollbar/dist/css/styles.css';
import "./AQLQueries.AddNew.scss";

const JSONViewer = React.lazy(() => import(/* webpackChunkName: "jsonViewer", webpackPreload: true */ 'react-json-viewer'));
const PerfectScroll = React.lazy(() => import(/* webpackChunkName: "pScroll", webpackPreload: true */ 'react-perfect-scrollbar'));

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
							this.addToPreviewResults
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
			previewResults: []
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
			<PeculiarFortifyCertificates hideFooter={true}/>
			<PerfectScroll>
				<Suspense fallback={<div className="LoadingMsg">Loading the CreateForm...</div>}>
					<CreateForm {...this.state.editConfig} />
				</Suspense>

				<Suspense fallback={<div className="LoadingMsg">Loading the PreViewer...</div>}>
					{this.state.previewResults.length && <h3>Preview</h3>}
					<Collapse className="AQLQueries-AddNew-PreviewResults">
							{this.state.previewResults.map((result, index) => <CollapsePanel key={index}>
								<PerfectScroll>
								<JSONViewer json={result}></JSONViewer>
								</PerfectScroll>
						</CollapsePanel>)}
					</Collapse>
				</Suspense>
			</PerfectScroll>
		</PageHeader>
	}

	addToPreviewResults = ({ result }) => {
		this.setState({ previewResults: [result, ...this.state.previewResults] });
	}	

	onClick = ev => {
	}
}

export default AQLQueriesAddNew;