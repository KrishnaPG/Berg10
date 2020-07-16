import React from 'react';
import FlexLayout from 'flexlayout-react';

import flexFactory from './flexFactory';
import defaultLayout from './Layouts/default';
import { gEventBus } from '../globals';

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
		gEventBus.addEventListener("panel.add", this.onPanelAdd);
		gEventBus.addEventListener("panel.show.typeRepo", this.onPanelTypeRepo);	
	}
	componentWillUnmount() {
		gEventBus.removeEventListener("panel.add", this.onPanelAdd);
		gEventBus.removeEventListener("panel.show.typeRepo", this.onPanelTypeRepo);
	}	
	
	render() {
		return <FlexLayout.Layout ref="layout" model={this.state.layoutModel} factory={flexFactory}/>;
	}

	onPanelAdd = ev => {
		this.refs.layout.addTabToActiveTabSet({
			component: "test",
			name: "added",
			config: { text: "i was added" }
		}, null);		
	}

	onPanelTypeRepo = ev => {
		const existingTab = this.state.layoutModel.getNodeById("TypeRepo");
		existingTab ?
			this.state.layoutModel.doAction(FlexLayout.Actions.selectTab("TypeRepo")) :
			this.refs.layout.addTabToActiveTabSet({ component: "TypeRepo", name: "TypeRepo", id: "TypeRepo", config: { text: "i was added" } }, null);
	}

};

export default Dashboard;
