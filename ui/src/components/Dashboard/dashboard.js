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
	}
	componentWillUnmount() {
		gEventBus.removeEventListener("panel.add", this.onPanelAdd);
	}	
	
	render() {
		return <FlexLayout.Layout ref="layout" model={this.state.layoutModel} factory={flexFactory} />;
	}

	onPanelAdd = ev => {
		this.refs.layout.addTabWithDragAndDropIndirect("Add panel<br>(Drag to location)", {
			component: "test",
			name: "added",
			config: { text: "i was added" }
		}, null);		
	}

};

export default Dashboard;
