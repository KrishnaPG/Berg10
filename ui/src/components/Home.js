/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { Avatar, Card } from 'antd';
import { triggerLogout } from './globals';

import "./home.scss";

const EditOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/EditOutlined'));
const LogoutOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/LogoutOutlined'));
const SettingOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/SettingOutlined'));

const { Meta } = Card;

class Home extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
		};
	}

	render() {
		return (
			<Card id="home-card" className="sidebar-card"
				cover={
					<div className="logo">
						<img className="logo-image" alt="Berg10" src="/logo64.jpg" title="Berg10"	/>
						<span className="logo-text" title="Berg10">Berg10</span>
					</div>
				}
				actions={[
					<SettingOutlined key="setting" />,
					<EditOutlined key="edit" />,
					<LogoutOutlined key="logout" title="Logout" onClick={triggerLogout}/>
				]}
			>
				<Meta
					avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
					title="Card title"
					description="This is the description"
				/>
				<div className="bodyDetails">
					<h2>Hello world</h2>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
					<p>some long content</p>
				</div>

			</Card>
		);
	}
};

export default Home;