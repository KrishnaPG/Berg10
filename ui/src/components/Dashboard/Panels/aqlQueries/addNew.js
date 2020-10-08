/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { CreateForm } from '../sula';
import { getSulaFormField, getFieldDefaultValues } from '../sula/formFields';
import { jsonRPCObj } from '../../../../globals/utils';
import { Button, PageHeader } from '../antComponents';
import {Convert} from 'pvtsutils';

import 'react-perfect-scrollbar/dist/css/styles.css';
import "../panel.scss";

const PerfectScroll = React.lazy(() => import(/* webpackChunkName: "pScroll", webpackPreload: true */ 'react-perfect-scrollbar'));
const ResultPreviews = React.lazy(() => import(/* webpackChunkName: "aql-previews", webpackPreload: true */ './previews'));
const CertSigner = React.lazy(() => import(/* webpackChunkName: "certSign", webpackPrefetch: true */ '../certSigner'));

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
			previewResults: [],
			certSignerIsVisible: false
		};
	}

	componentDidMount() {
	}
	componentWillUnmount() {
	}

	render() {	
		return (<PageHeader
			className="pageHeader"
			title="AQL Query"
			subTitle=""
			extra={[
				<Button key="2" onClick={this.onShowSignerModal} loading={this.state.certSignerIsVisible}>Operation</Button>,
				<Button key="1" type="primary">
					Primary
					</Button>,
			]}>
			<PerfectScroll>
				<Suspense fallback={<div className="LoadingMsg">Loading the CreateForm...</div>}>
					<CreateForm {...this.state.editConfig} />
				</Suspense>
				
				<ResultPreviews previewResults={this.state.previewResults}></ResultPreviews>
			</PerfectScroll>

			<Suspense fallback={<div className="LoadingMsg">Loading the CertSigner...</div>}>
				<CertSigner
					isVisible={this.state.certSignerIsVisible}
					onCancel={this.onSignerModalCancel}
					onOk={this.onSignerModalOk}>
				</CertSigner>
			</Suspense>
		</PageHeader>);
	}

	addToPreviewResults = ({ result }) => {
		this.setState({ previewResults: [result, ...this.state.previewResults] });
	}	

	onShowSignerModal = ev => {
		this.setState({ certSignerIsVisible: true });
	}

	onSignerModalCancel = ev => {
		this.setState({ certSignerIsVisible: false });
	}

	onSignerModalOk = async ev => {
		const selectedCert = ev.detail;

		const provider = await selectedCert.server.getCrypto(selectedCert.providerId);
		const privateKey = await provider.keyStorage.getItem(selectedCert.privateKeyId);
		if (!privateKey) throw new Error('Selected Certificate does not have a private key');

		const message = Convert.FromUtf8String("Test message");

		const alg = { name: privateKey.algorithm.name, hash: privateKey.algorithm.hash.name };
		const sign = await provider.subtle.sign(alg, privateKey, message);

		console.log("sign: ", Convert.ToHex(sign));
		const cert = await provider.certStorage.getItem(selectedCert.certificateId);
		const publicKey = cert.publicKey;

		const result = await provider.subtle.verify(alg, publicKey, sign, message);
		console.log("verification result: ", result, alg);

		this.setState({ certSignerIsVisible: false }); // hide the ui
	}

}

export default AQLQueriesAddNew;