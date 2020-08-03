/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import FlexLayout from 'flexlayout-react';

import { default as flexFactory, iconFactory } from './flexFactory';
import defaultLayout from './Layouts/default';
import {
	setAxiosAuthBearer,

	subscribeToEvNotifyWarning,
	unSubscribeToEvNotifyWarning,

	subscribeToEvNotifyError,
	unSubscribeToEvNotifyError,

	subscribeToEvPanelAdd,
	unSubscribeToEvPanelAdd
} from '../../globals';

class Dashboard extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			layoutModel: null
		};
		// Load the FlexLayout from props
		try {
			this.state.layoutModel = FlexLayout.Model.fromJson(props.layoutJSON || defaultLayout);
		} catch (ex) {
			console.log("FlexLayoutModel.fromJson failed. Defaulting to built-in layout. Failed layout: ", props.layoutJSON);
			// happens if props.layoutJSON is corrupt (non-empty or invalid layout format etc.)
			this.state.layoutModel = FlexLayout.Model.fromJson(defaultLayout);
		}
		// Lazy load the notifications module
		import(/* webpackChunkName: "antd-notify" */ 'antd/es/notification/index').then(module => {
			this.notification = module.default;
			subscribeToEvNotifyError(this.onNotifyError);
			subscribeToEvNotifyWarning(this.onNotifyWarning);
			// when component is remounted, we need to resubscribe again. But
			// will components remount without getting destructed and reconstructed?
		});
	}

	componentDidMount() {
		subscribeToEvPanelAdd(this.onPanelAdd);
	}
	componentWillUnmount() {
		unSubscribeToEvPanelAdd(this.onPanelAdd);
		unSubscribeToEvNotifyError(this.onNotifyError);
		unSubscribeToEvNotifyWarning(this.onNotifyWarning);
	}
	static getDerivedStateFromProps(props, state) {
		// update the jwt for global axios instance whenever props changed
		setAxiosAuthBearer(props.jwt);
		return null;
	}
	
	render() {
		return <FlexLayout.Layout
			ref="layout"
			factory={flexFactory}
			iconFactory={iconFactory}
			model={this.state.layoutModel}
			onModelChange={this.onModelChange}
		/>;
	}

	onModelChange = ev => {
		// console.log("model changed: ", ev);
	}

	onPanelAdd = ev => {
		const existingTab = ev.detail.bringToFocus ? this.state.layoutModel.getNodeById(ev.detail.id) : null;
		existingTab ?
			this.state.layoutModel.doAction(FlexLayout.Actions.selectTab(ev.detail.id)) :
			this.refs.layout.addTabToActiveTabSet(ev.detail);
	}

	onNotifyWarning = ev => {
		this.notification.warning({ placement: "bottomRight", ...this.jsonErrorToNotifyObj(ev.detail) });
	}

	onNotifyError = ev => {
		this.notification.error({ placement: "bottomRight", ...this.jsonErrorToNotifyObj(ev.detail) });
	}

	jsonErrorToNotifyObj(error) {
		const title = "message", message = "description";// AntD has this weird convention
		return {
			[title]: error.title || error.message || error,
			[message]: (error.title ? error.message : error.description)
		}
	}

	// onPanelTypeRepo = ev => {
	// 	const existingTab = this.state.layoutModel.getNodeById("TypeRepo");
	// 	existingTab ?
	// 		this.state.layoutModel.doAction(FlexLayout.Actions.selectTab("TypeRepo")) :
	// 		this.refs.layout.addTabToActiveTabSet({ component: "TypeRepo", name: "TypeRepo", id: "TypeRepo", config: { text: "i was added" } }, null);
	// }

};

export default Dashboard;
