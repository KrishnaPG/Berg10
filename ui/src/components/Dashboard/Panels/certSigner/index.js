/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { Modal, Step, Steps } from '../antComponents';

import { PeculiarFortifyCertificates } from '@peculiar/fortify-webcomponents-react';
import "@peculiar/fortify-webcomponents/dist/peculiar/peculiar.css";

import "./fortify-vars.scss";

class CertSigner extends React.PureComponent { 
	constructor(props) {
		super(props);
	}
	
	render() {
		const filters = {
			onlySmartcards: false,
			expired: false,
			onlyWithPrivateKey: true,
			// subjectDNMatch: 'apple',
			// subjectDNMatch: new RegExp(/apple/),
			// issuerDNMatch: 'demo',
			// issuerDNMatch: new RegExp(/demo/),
			// providerNameMatch: 'MacOS',
			// providerNameMatch: new RegExp(/MacOS/),
			keyUsage: ['digitalSignature'],
		};
		return <Modal
			centered={true}
			destroyOnClose={true}
			footer={null}
			maskClosable={false}
			visible={this.props.isVisible}
			width={window.outerWidth/2}
			onCancel={this.props.onCancel}
		>
			<Suspense fallback={<div className="LoadingMsg">Loading the Steps...</div>}>
				<Steps current={1}>
					<Step title="Source" description="This is a description."/>
					<Step title="Certificate" />
					<Step title="Verification" />
				</Steps>
			</Suspense>

			<PeculiarFortifyCertificates
				hideFooter={true}
				filters={filters}
				onCancel={this.props.onCancel}
				onContinue={this.props.onOk} />
		</Modal>
	}
};

export default CertSigner;