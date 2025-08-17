/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { Convert } from 'pvtsutils';
import { EditOutlined, MailOutlined, LogoutOutlined, SettingOutlined } from './Panels/icons';
import { Card, Menu, MenuItem, SubMenu } from './Panels/antComponents';
import {
	triggerLogout,
	triggerNotifyWarning,
	triggerNotifyError,
	triggerPanelAQLQueries,
	triggerPanelDMN,
	triggerPanelTypeRepo,
	triggerPanelUsers,
} from '../../globals/triggers';

import "./xplore.scss";

const CertSigner = React.lazy(() => import(/* webpackChunkName: "certSign", webpackPrefetch: true */ './Panels/certSigner'));

class Xplore extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			certSignerIsVisible: false
		};
	}

	// shouldComponentUpdate(nextProps, nextState) {
	// 	return false;
	// }

	render() {
		return (
			<Card id="xplore-card" className="sidebar-card"
				cover={
					<div className="logo">
						<span className="logo-text" title="Berg10">Berg10</span>
					</div>
				}
				actions={[
					<SettingOutlined key="setting" />,
					<EditOutlined key="edit" />,
					<LogoutOutlined key="logout" title="Logout" onClick={triggerLogout} />,
					<MailOutlined key="chart" />
				]}
			>
				<Menu
					defaultSelectedKeys={['1']}
					defaultOpenKeys={['sub1']}
					mode="inline"
					theme="dark"
					inlineCollapsed={this.state.collapsed}
				>
					<MenuItem key="panelTypeRepo" onClick={triggerPanelTypeRepo}>
						Type Repo
          </MenuItem>
					<MenuItem key="panelUsers" onClick={triggerPanelUsers}>
						Users
          </MenuItem>
					<MenuItem key="panelAQL" onClick={triggerPanelAQLQueries}>
						AQL Queries
          </MenuItem>
					<MenuItem key="certSigner" onClick={this.onShowSignerModal}>
						CertSigner
          </MenuItem>
					<MenuItem key="panelDMN" onClick={triggerPanelDMN}>
						DMN
          </MenuItem>
					<SubMenu key="sub1" icon={<MailOutlined />} title="Navigation One">
						<MenuItem key="5" onClick={ev => triggerNotifyWarning({ message: "Option 5" })}>Option 5</MenuItem>
						<MenuItem key="6" onClick={ev => triggerNotifyWarning({ message: "Option 6" }) }>Option 6</MenuItem>
						<MenuItem key="7" onClick={ev => triggerNotifyError({ message: "error7" }) }>Option 7</MenuItem>
						<MenuItem key="8" onClick={ev => triggerNotifyError({ message: "error8" })}>Option 8</MenuItem>
					</SubMenu>
					<SubMenu key="sub2" title="Navigation Two">
						<MenuItem key="9">Option 9</MenuItem>
						<MenuItem key="10">Option 10</MenuItem>
						<SubMenu key="sub3" title="Submenu">
							<MenuItem key="11">Option 11</MenuItem>
							<MenuItem key="12">Option 12</MenuItem>
						</SubMenu>
					</SubMenu>
				</Menu>
				<Suspense fallback={<div className="LoadingMsg">Loading the CertSigner...</div>}>
					<CertSigner
						isVisible={this.state.certSignerIsVisible}
						onCancel={this.onSignerModalCancel}
						onOk={this.onSignerModalOk}>
					</CertSigner>
				</Suspense>
			</Card>
		);
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
};

export default Xplore;