/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import FlexLayout from 'flexlayout-react';

import { default as flexFactory, iconFactory } from './flexFactory';
import defaultLayout from './Layouts/default';
import { gAxios, subscribeToEvNotify, unSubscribeToEvNotify, subscribeToEvPanelAdd, unSubscribeToEvPanelAdd } from '../../globals';

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
	}

	componentDidMount() {
		subscribeToEvPanelAdd(this.onPanelAdd);
		subscribeToEvNotify(this.onNotify);
	}
	componentWillUnmount() {
		unSubscribeToEvNotify(this.onNotify);
		unSubscribeToEvPanelAdd(this.onPanelAdd);
	}	
	static getDerivedStateFromProps(props, state) {
		// update the jwt for global axios instance whenever props changed
		gAxios.defaults.headers.common['Authorization'] = `Bearer ${props.jwt}`;
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

	onNotify = ev => {

	}

	onPanelAdd = ev => {
		const existingTab = ev.detail.bringToFocus ? this.state.layoutModel.getNodeById(ev.detail.id) : null;
		existingTab ?
			this.state.layoutModel.doAction(FlexLayout.Actions.selectTab(ev.detail.id)) :
			this.refs.layout.addTabToActiveTabSet(ev.detail);
	}

	// onPanelTypeRepo = ev => {
	// 	const existingTab = this.state.layoutModel.getNodeById("TypeRepo");
	// 	existingTab ?
	// 		this.state.layoutModel.doAction(FlexLayout.Actions.selectTab("TypeRepo")) :
	// 		this.refs.layout.addTabToActiveTabSet({ component: "TypeRepo", name: "TypeRepo", id: "TypeRepo", config: { text: "i was added" } }, null);
	// }

};

export default Dashboard;
