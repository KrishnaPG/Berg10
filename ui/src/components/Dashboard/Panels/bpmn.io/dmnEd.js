/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { triggerNotifyError } from '../../../../globals/triggers';

import DMNModeler from 'dmn-js/lib/Modeler';

import "dmn-js/dist/assets/diagram-js.css";
import "dmn-js/dist/assets/dmn-js-shared.css";
import "dmn-js/dist/assets/dmn-js-drd.css";
import "dmn-js/dist/assets/dmn-js-decision-table.css";
import "dmn-js/dist/assets/dmn-js-decision-table-controls.css";
import "dmn-js/dist/assets/dmn-js-literal-expression.css";
import "dmn-js/dist/assets/dmn-font/css/dmn.css";

import "./dmnEd.scss";

class DMNEditor extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {};
		this.dmnModeler = null;
		this.elHost = React.createRef();
	}
	
	componentDidMount() {
		// create the modeler
		this.dmnModeler = new DMNModeler({
			container: this.elHost.current,
			height: '100%',
			width: '100%',
			keyboard: {
				bindTo: window
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
		});
		// TODO: whenever the prop changes, re-import that 
	}

	componentWillUnmount() {
		if (this.dmnModeler) {
			this.dmnModeler.destroy();
			this.dmnModeler = null;
		}
	}


	render() {
		return <div className="dmnEditorHost" ref={this.elHost} />;
	}
}

export default DMNEditor;