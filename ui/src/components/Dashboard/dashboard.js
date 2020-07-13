import React from 'react';
import FlexLayout from 'flexlayout-react';

import flexFactory from './flexFactory';
import defaultLayout from './Layouts/default';

// Prepare Sula
import { registerFieldPlugins, registerRenderPlugins, registerActionPlugins, registerFilterPlugins, Icon } from 'sula';
import { UserOutlined } from '@ant-design/icons';
// Register the plugins for Sula
registerFieldPlugins();
registerRenderPlugins();
registerActionPlugins();
registerFilterPlugins();
// Register icons for Sula
Icon.iconRegister({
	user: UserOutlined
});


class Dashboard extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			layoutModel: null
		};
		try {
			this.state.layoutModel = FlexLayout.Model.fromJson(props.layoutJSON || defaultLayout);
		} catch (ex) {
			console.log("FlexLayoutModel.fromJson failed. Defaulting to built-in layout. Failed layout: ", props.layoutJSON);
			// happens if props.layoutJSON is corrupt (non-empty or invalid layout format etc.)
			this.state.layoutModel = FlexLayout.Model.fromJson(defaultLayout);
		}
		setInterval(() => {
			props.user.time = Date.now();
		}, 2000);
	}
	
	render() {
		return <FlexLayout.Layout	model={this.state.layoutModel} factory={flexFactory} />;
	}

};

export default Dashboard;
