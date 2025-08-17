/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { triggerNotifyError } from '../../../../globals/triggers';

import DMNModeler from 'dmn-js/lib/Modeler';

import propertiesPanelModule from 'dmn-js-properties-panel';
import drdAdapterModule from 'dmn-js-properties-panel/lib/adapter/drd';
import propertiesProviderModule from 'dmn-js-properties-panel/lib/provider/camunda';
import camundaModdleDescriptor from 'camunda-dmn-moddle/resources/camunda';

import customControlsModule from './customControls';

import "dmn-js/dist/assets/diagram-js.css";
import "dmn-js/dist/assets/dmn-js-shared.css";
import "dmn-js/dist/assets/dmn-js-drd.css";
import "dmn-js/dist/assets/dmn-js-decision-table.css";
import "dmn-js/dist/assets/dmn-js-decision-table-controls.css";
import "dmn-js/dist/assets/dmn-js-literal-expression.css";
import "dmn-js/dist/assets/dmn-font/css/dmn.css";

import "./dmnEd.scss";

class DMNEditor extends React.PureComponent {
	constructor(props = { dmnXML: '', elPropPanel: null, onSave: (err, xml) => { } }) {
		super(props);
		this.state = {};
		this.dmnModeler = null;
		this.elHost = React.createRef();
		this.elPropPanel = props.elPropPanel || React.createRef();
	}
	
	componentDidMount() {
		// create the modeler
		this.dmnModeler = new DMNModeler({
			container: this.elHost.current,
			height: '100%',
			width: '100%',
			// drd specific settings
			drd: {
				keyboard: {
					bindTo: window
				},
				additionalModules: [
					propertiesPanelModule,
					propertiesProviderModule,
					drdAdapterModule,
					customControlsModule
				],
				propertiesPanel: {
					parent: this.elPropPanel.current,
				}
			},
			// make camunda prefix known for import, editing and export
			moddleExtensions: {
				camunda: camundaModdleDescriptor
			}
		});

		// load the xml diagram content
		this.dmnModeler.importXML(this.props.dmnXML, error => {
			if (error) {
				return triggerNotifyError(error);
			}
			const activeEditor = this.dmnModeler.getActiveViewer();
			// access active editor components
			const canvas = activeEditor.get('canvas');
			// zoom to fit full viewport
			canvas.zoom('fit-viewport');
			// handle io-control events, such as save, load etc.
			const eventBus = activeEditor.get('eventBus');
			eventBus.on('io-controls.load', e => console.log("event received load: ", e));
			eventBus.on('io-controls.save', e => this.dmnModeler.saveXML({ format: true }, this.props.onSave));
			// handle changes
			eventBus.on('commandStack.changed', e => console.log("commandStack.changed event: ", e));
		});
		//this.dmnModeler.on('views.changed', e => console.log("view change event: ", e))
		// TODO: whenever the prop changes, re-import the props.dmnXML into the modeler
	}

	componentWillUnmount() {
		if (this.dmnModeler) {
			this.dmnModeler.destroy();
			this.dmnModeler = null;
		}
	}


	render() {
		if (!this.props.elPropPanel) {
			// TODO: create a local custom properties panel
		}
		return (
			<div className="dmnEditorHost" ref={this.elHost} >
				{/* <div className="dmnEditorProps" ref={this.elPropPanel}></div> */}
			</div>
		);
	}
}

export default DMNEditor;