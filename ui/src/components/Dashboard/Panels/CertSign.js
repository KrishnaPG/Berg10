/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { Modal } from './antComponents';

import { PeculiarFortifyCertificates } from '@peculiar/fortify-webcomponents-react';
import "@peculiar/fortify-webcomponents/dist/peculiar/peculiar.css";

import "./CertSign.scss";

class AQLQueriesAddNew extends React.PureComponent { 
	constructor(props) {
		super(props);
	}
	
	render() {
		return <Modal
			centered={true}
			destroyOnClose={true}
			footer={null}
			maskClosable={false}
			visible={this.props.isVisible}
			onCancel={this.props.onCancel}
		>
			<Suspense fallback={<div className="LoadingMsg">Loading the CertSign...</div>}>
				<PeculiarFortifyCertificates hideFooter={true} >
					<h2>Loading peculiar</h2>
				</PeculiarFortifyCertificates>
			</Suspense>
		</Modal>
	}
};

export default AQLQueriesAddNew;