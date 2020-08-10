/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { triggerLogout, triggerPanelAdd, triggerPanelTypeRepo, triggerNotifyWarning, triggerNotifyError } from '../../globals/triggers';

import "./xplore.scss";

const Card = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/card/index'));
const Menu = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/index'));
const MenuItem = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/MenuItem'));
const SubMenu = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/SubMenu'));


const EditOutlined = React.lazy(() => import(/* webpackChunkName: "sidebarIcons", webpackPreload: true */ '@ant-design/icons/EditOutlined'));
const MailOutlined = React.lazy(() => import(/* webpackChunkName: "sidebarIcons", webpackPreload: true */ '@ant-design/icons/MailOutlined'));
const LogoutOutlined = React.lazy(() => import(/* webpackChunkName: "sidebarIcons", webpackPreload: true */ '@ant-design/icons/LogoutOutlined'));
const SettingOutlined = React.lazy(() => import(/* webpackChunkName: "sidebarIcons", webpackPreload: true */ '@ant-design/icons/SettingOutlined'));


class Xplore extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
		};
	}

	// shouldComponentUpdate(nextProps, nextState) {
	// 	return false;
	// }

	render() { console.log("xplore render")
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
					<MenuItem key="1" onClick={triggerPanelTypeRepo}>
						Type Repo
          </MenuItem>
					<MenuItem key="2" onClick={triggerPanelAdd}>
						Option 2
          </MenuItem>
					<MenuItem key="3" onClick={triggerPanelAdd}>
						Option 3
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
			</Card>
		);
	}
};

export default Xplore;