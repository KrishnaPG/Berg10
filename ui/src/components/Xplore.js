/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { Avatar, Card, Menu, Button } from 'antd';

import { triggerLogout, triggerPanelAdd, triggerPanelTypeRepo } from '../globals/triggers';
import "./xplore.scss";

const EditOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/EditOutlined'));
const LogoutOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/LogoutOutlined'));
const SettingOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/SettingOutlined'));
const AppstoreOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/AppstoreOutlined'));
const PieChartOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/PieChartOutlined'));
const DesktopOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/DesktopOutlined'));
const ContainerOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/ContainerOutlined'));
const MailOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/MailOutlined'));

const { SubMenu } = Menu;

class Xplore extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
		};
	}

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
					<PieChartOutlined key="chart" />
				]}
			>
				<Menu
					defaultSelectedKeys={['1']}
					defaultOpenKeys={['sub1']}
					mode="inline"
					theme="dark"
					inlineCollapsed={this.state.collapsed}
				>
					<Menu.Item key="1" icon={<PieChartOutlined />} onClick={triggerPanelTypeRepo}>
						Type Repo
          </Menu.Item>
					<Menu.Item key="2" icon={<DesktopOutlined />} onClick={triggerPanelAdd}>
						Option 2
          </Menu.Item>
					<Menu.Item key="3" icon={<ContainerOutlined />} onClick={triggerPanelAdd}>
						Option 3
          </Menu.Item>
					<SubMenu key="sub1" icon={<MailOutlined />} title="Navigation One">
						<Menu.Item key="5" onClick={triggerPanelAdd}>Option 5</Menu.Item>
						<Menu.Item key="6" onClick={triggerPanelAdd}>Option 6</Menu.Item>
						<Menu.Item key="7">Option 7</Menu.Item>
						<Menu.Item key="8">Option 8</Menu.Item>
					</SubMenu>
					<SubMenu key="sub2" icon={<AppstoreOutlined />} title="Navigation Two">
						<Menu.Item key="9">Option 9</Menu.Item>
						<Menu.Item key="10">Option 10</Menu.Item>
						<SubMenu key="sub3" title="Submenu">
							<Menu.Item key="11">Option 11</Menu.Item>
							<Menu.Item key="12">Option 12</Menu.Item>
						</SubMenu>
					</SubMenu>
				</Menu>				
			</Card>
		);
	}
};

export default Xplore;